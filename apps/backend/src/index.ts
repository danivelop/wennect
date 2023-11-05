import express from 'express'

import http from 'http'

const app = express()

app.get('/', (req, res) => {
  res.send('hello world')
})

http.createServer(app).listen(4000, () => {
  console.log('ser is running')
})
