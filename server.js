const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");
let redisClient;
const DEFAULT_EXPIRATION = 3600;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const start = async () => {
  try {
    redisClient = await Redis.createClient();
    await redisClient.connect();
    app.listen(3000);
  } catch (error) {
    console.log("Redis Client Error", err);
  }
};

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos",
      { params: { albumId } }
    );
    return data;
  });
  res.json(photos);
});

app.get("/photos/:id", async (req, res) => {
  const photo = await getOrSetCache(`photos:${req.params.id}`, async () => {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );
    return data;
  });
  res.json(photo);
});

const getOrSetCache = async (key, cb) => {
  try {
    const data = await redisClient.get(key);
    if (data != null) return JSON.parse(data);
    console.log("cache miss");
    const freshData = await cb();
    redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
    return freshData;
  } catch (error) {
    console.log(error);
  }
};

start();
