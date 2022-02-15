require('dotenv').config();

const needle = require('needle');

const { TwitterClient } = require('twitter-api-client');

const twitterClient = new TwitterClient({
  apiKey: process.env.OAUTH_CONSUMER_KEY,
  apiSecret: process.env.OAUTH_CONSUMER_SECRET,
  accessToken: process.env.OAUTH_TOKEN,
  accessTokenSecret: process.env.OAUTH_TOKEN_SECRET
});

function streamConnect(retryAttempt) {
  const stream = needle.get('https://api.twitter.com/2/tweets/search/stream', {
    headers: {
      "User-Agent": "v2FilterStreamJS",
      "Authorization": `Bearer ${process.env.BEARER_TOKEN}`
    },
    timeout: 20000
  });

  stream.on('data', data => {
    try {
      const json = JSON.parse(data);
      console.log('(test) JSON response> ', json);

      const { id } = {...data};
      console.log('(test) ID from JSON response> ', json.data.id);

      retryAttempt = 0;     // event for successful connection resets (retry count)
      retweet(json.data.id);

    } catch (errorEvent) {
      console.log('(test) INSIDE ERROR-VAULT: DATA> ', data);
      
      // checking if we're exceeding the connection requests according to twitter's API service
      if (data.detail === 'This stream is currently at the maximum allowed connection limit.') {
        console.log(data.detail);
        process.exit(1);
      }
    }
  }).on('err', error => {
    if (error.code !== 'ECONNRESET') {
      console.log(error.code);
      process.exit(1);
    } else {
      setTimeout(() => {
        console.warn('A connection error occurred. Reconnecting...');
        streamConnect(++retryAttempt);
      }, 2 ** retryAttempt);
    }
  });
  return stream;
}

(async() => {
  streamConnect(0);
})();

const retweet = tweetId => {
  const retweetResponse = twitterClient.tweets.statusesRetweetById({ id: tweetId });
  retweetResponse
    .then((_response => console.log(_response)))
    .catch((_error) => console.log(_error))
}