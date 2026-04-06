import express from "express";
import ejs from "ejs";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  const options = {
    method: "GET",
    url: "http://api.football-data.org/v4/competitions",

    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "79a282c9983b455bb083c96a8b3582f7",
      },
      params: { areas: "2077" },
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    res.render("index.ejs", { main: response.data });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }

  // res.render("index.ejs");
});

app.post("/comp", async (req, res) => {
  const data = JSON.parse(req.body.competition);
  let year = data.startDate[0] + data.startDate[1] + data.startDate[2] + data.startDate[3]

  if (data.code === "CL" || data.code === "EC") {
    year = null;
  }

  const options = {
    method: "GET",
    url: "http://api.football-data.org/v4/competitions/",
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "79a282c9983b455bb083c96a8b3582f7",
      },
      params: { season: year },
    },
  };

  try {
    const response = await axios.get(options.url + data.code + "/standings", options.config);
    // console.log(response.data.standings);
    res.render("competition.ejs", { standHeader: response.data, standRow: response.data.standings });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }

});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
