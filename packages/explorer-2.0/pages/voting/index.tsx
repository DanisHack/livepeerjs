import { Flex, Styled } from 'theme-ui'
import Ballot from '../../public/img/ballot.svg'
import Layout from '../../layouts/main'
import { Box } from 'theme-ui'
import Button from '../../components/Button'
import { withApollo } from '../../lib/apollo'
import { useWeb3React } from '@web3-react/core'
import { useQuery } from '@apollo/react-hooks'
import Spinner from '../../components/Spinner'
import Card from '../../components/Card'
import IPFS from 'ipfs-mini'
import fm from 'front-matter'
import { useEffect, useState } from 'react'
import moment from 'moment'
import Link from 'next/link'
import gql from 'graphql-tag'
import { detectNetwork } from '../../lib/utils'

const Voting = () => {
  const ipfs = new IPFS({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
  })
  const allPollsQuery = require('../../queries/allPolls.gql')
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const { data } = useQuery(allPollsQuery, {
    pollInterval: 10000,
  })
  const { data: blockData } = useQuery(
    gql`
      {
        block(id: "latest")
      }
    `,
  )

  useEffect(() => {
    if (data && blockData) {
      let pollArr = []
      const init = async () => {
        if (!data.polls.length) {
          setLoading(false)
          return
        }
        const network = await detectNetwork(window['web3']?.currentProvider)
        await Promise.all(
          data.polls.map(async poll => {
            const countdownRaw = await fetch(
              `https://api-${
                network.type ? 'rinkeby' : 'mainnet'
              }.etherscan.io/api?module=block&action=getblockcountdown&blockno=${
                poll.endBlock
              }&apikey=${process.env.ETHERSCAN_API_KEY}`,
            )
            const countdownResponse = await countdownRaw.json()
            const blockInfoRaw = await fetch(
              `https://api-${
                network.type ? 'rinkeby' : 'mainnet'
              }.etherscan.io/api?module=block&action=getblockcountdown&blockno=${
                poll.endBlock
              }&apikey=${process.env.ETHERSCAN_API_KEY}`,
            )
            const blockInfoResponse = await blockInfoRaw.json()
            const { proposal } = await ipfs.catJSON(poll.proposal)
            const transformedProposal = fm(proposal.text)
            pollArr.push({
              ...poll,
              ...transformedProposal,
              estimatedTimeRemaining:
                countdownResponse.result.EstimateTimeInSec,
              endTime: blockInfoResponse.result.timeStamp,
            })
          }),
        )
        setPolls(pollArr)
        setLoading(false)
      }
      init()
    }
  }, [data, blockData])

  return (
    <Layout title="Livepeer Explorer - Voting" headerTitle="Voting">
      {loading ? (
        <Flex
          sx={{
            height: [
              'calc(100vh - 100px)',
              'calc(100vh - 100px)',
              'calc(100vh - 100px)',
              '100vh',
            ],
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Spinner />
        </Flex>
      ) : (
        <Flex
          sx={{
            mt: [3, 3, 3, 5],
            width: '100%',
            flexDirection: 'column',
          }}
        >
          <Flex
            sx={{
              mb: 4,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Styled.h1
              sx={{
                fontSize: [3, 3, 4, 5],
                display: 'flex',

                alignItems: 'center',
              }}
            >
              <Ballot
                sx={{
                  width: [20, 20, 20, 26],
                  height: [20, 20, 20, 26],
                  color: 'primary',
                  mr: 2,
                }}
              />
              Voting
            </Styled.h1>
            <Link href="/voting/create-poll" as="/voting/create-poll">
              <a>
                <Button>Create Poll</Button>
              </a>
            </Link>
          </Flex>
          <Box>
            {polls.map(poll => (
              <Link
                key={poll.id}
                href="/voting/[poll]"
                as={`/voting/${poll.id}`}
              >
                <a>
                  <Card>
                    <Flex
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Box sx={{ mb: 1 }}>
                          {poll.attributes.title} (LIP {poll.attributes.lip})
                        </Box>
                        <Box sx={{ fontSize: 0, color: 'muted' }}>
                          {parseInt(blockData?.block?.number) >=
                          poll.endBlock ? (
                            <Box>
                              Voting ended on{' '}
                              {moment.unix(poll.endTime).format('MMM Do, YYYY')}
                            </Box>
                          ) : (
                            <Box>
                              Voting ends in ~
                              {moment()
                                .add(poll.estimatedTimeRemaining, 'seconds')
                                .fromNow(true)}
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box>Active</Box>
                    </Flex>
                  </Card>
                </a>
              </Link>
            ))}
          </Box>
        </Flex>
      )}
    </Layout>
  )
}

export default withApollo({
  ssr: false,
})(Voting)
