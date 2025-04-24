import { ethers } from 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.5/ethers.min.js'  // https://docs.ethers.org/v6/getting-started
const encode = MessagePack.encode

const url = 'https://api.hyperliquid-testnet.xyz'

async function main() {
    const elementsMeta = {
        'connectButton': {
            async click() {
                console.log(3)
            }
        },
        'switchButton': {
            async click() {
                // signer, usingBigBlocks

                const action = { type: 'evmUserModify', usingBigBlocks }

                const payload = await signL1ActionAsync({ isMainnet: false, signer, action, nonce: Date.now() })
                console.log(JSON.stringify(payload))

                const resp = await postAsync({
                    url,
                    endpoint: '/exchange',
                    payload,
                })
                console.log(JSON.stringify(resp))
            }
        },
    }
    const elements = {}
    for (const id in elementsMeta) {
        try {
            const element = elements[id] = document.getElementById(id)
            if (element === null) throw new Error(`Element ${id} not found`)

            const events = elementsMeta[id]
            for (const event in events) element.addEventListener(event, events[event])
        } catch (e) {
            console.error(`Failed to add event listeners to button ${id}. ${e}`)
        }
    }
}
main()

//////////////////////////////////////

async function signL1ActionAsync({ isMainnet, signer, subaccount = undefined, action, nonce }) {
    const { r, s, v } = ethers.Signature.from(await signer.signTypedData(
        {
            name: 'Exchange',
            version: '1',
            chainId: 1337,
            verifyingContract: '0x0000000000000000000000000000000000000000',
        },
        {
            Agent: [
                { name: 'source', type: 'string' },
                { name: 'connectionId', type: 'bytes32' },
            ],
        },
        {
            source: isMainnet ? 'a' : 'b',
            connectionId: actionHash({ activePool: subaccount, action, nonce }),
        },
    ))
    return { action, nonce, signature: { r, s, v }, vaultAddress: subaccount }
}

function actionHash({ activePool = undefined, action, nonce }) {
    const msgPackBytes = encode(action)
    const data = new Uint8Array(msgPackBytes.length + (activePool === undefined ? 9 : 29))
    data.set(msgPackBytes)

    const view = new DataView(data.buffer)
    view.setBigUint64(msgPackBytes.length, BigInt(nonce), false)

    if (activePool === undefined) {
        view.setUint8(msgPackBytes.length + 8, 0)
    } else {
        view.setUint8(msgPackBytes.length + 8, 1)
        data.set(ethers.getBytes(activePool), msgPackBytes.length + 9)
    }
    return ethers.keccak256(data)
}

async function postAsync({ url, endpoint = '', payload }) {
    return await fetch(url + endpoint, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }).then(response => {
        if (response.ok) {
            switch (response.status) {
                case 204:
                    break
                default:
                    return response.json()
            }
        } else {
            throw new Error("HTTP error")
        }
    })
}
