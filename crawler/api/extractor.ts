require('dotenv').config()

import axios from 'axios';

const get = (url: string) => {
  console.log(process.env.API_URL + url);

  return axios.get(process.env.API_URL + url);
}

const post = (url: string, params: any) => {
  return axios.post(process.env.API_URL + url, params);
}

export default {
  get,
  post
}
