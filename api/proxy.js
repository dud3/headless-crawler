require('dotenv').config()

const axios = require('axios').default;

const get = (url) => {
  console.log(process.env.READABILITY_API_URL + url);

  return axios.get(process.env.READABILITY_API_URL + url);
}

const post = (url, params) => {
  return axios.post(process.env.READABILITY_API_URL + url, params);
}

module.exports = {
  get,
  post
};
