import fetch from 'isomorphic-unfetch'
import LivepeerSDK from '@adamsoffer/livepeer-sdk'
import Utils from 'web3-utils'

export async function account(_obj, _args, _ctx, _info) {
  const { rpc } = await LivepeerSDK({ gas: 2.1 * 1000000 })
  const { allowance } = await rpc.getDelegator(_args.id)
  return {
    id: _args.id,
    tokenBalance: await rpc.getTokenBalance(_args.id),
    ethBalance: await rpc.getEthBalance(_args.id),
    allowance: allowance,
  }
}

export async function protocol(_obj, _args, _ctx, _info) {
  const { rpc } = await LivepeerSDK({ gas: 2.1 * 1000000 })
  const { totalTokenSupply, totalBondedToken, paused } = await rpc.getProtocol()
  return {
    paused,
    inflation: await rpc.getInflation(),
    inflationChange: await rpc.getInflationChange(),
    totalTokenSupply,
    totalBondedToken,
  }
}

export async function getTxReceiptStatus(_obj, _args, _ctx, _info) {
  const data = await fetch(
    `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${_args.txHash}&apikey=${process.env.ETHERSCAN_API_KEY}`,
  )

  const response = await data.json()

  return {
    status: response.result.status,
  }
}

export async function threeBoxSpace(_obj, _args, _ctx, _info) {
  const { validateLink } = require('3id-blockchain-utils')
  const Box = require('3box')
  const id = _args.id.toLowerCase()

  let useThreeBox = false
  let profile
  let space

  profile = await Box.getProfile(_args.id)
  space = await Box.getSpace(_args.id, 'livepeer')

  if (space.defaultProfile === '3box') {
    useThreeBox = true
  }

  let addressLinks = []
  if (Object.entries(space).length) {
    const conf = await Box.getConfig(id)
    try {
      const links = await Promise.all(
        conf.links.map(link => validateLink(link)),
      )
      addressLinks = links.filter((link: any) => {
        return (
          link &&
          Utils.toChecksumAddress(link.address) != Utils.toChecksumAddress(id)
        )
      })
    } catch (e) {
      console.log(e)
    }
  }

  const { did } = await Box.getVerifiedAccounts(profile)

  return {
    id,
    name: useThreeBox ? profile.name : space.name,
    websote: useThreeBox ? profile.website : space.website,
    description: useThreeBox ? profile.description : space.description,
    image: useThreeBox ? profile.image : space.image,
    defaultProfile: space.defaultProfile,
    addressLinks,
    did,
  }
}
