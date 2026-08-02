import express from "express";
import ejs from "ejs";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const AuthToken = '79a282c9983b455bb083c96a8b3582f7';

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true })); // Middleware dati

app.get("/", async (req, res) => {
  const options = {
    method: "GET",
    url: "http://api.football-data.org/v4/competitions",

    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
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
});

app.post("/comp", async (req, res) => {
  const transcodeSeason = [
    {
      year: "2026",
      code: "2026/27"
    },
    {
      year: "2025",
      code: "2025/26"
    },
    {
      year: "2024",
      code: "2024/25"
    },
    {
      year: "2023",
      code: "2023/24"
    },
  ];
  const data = JSON.parse(req.body.competition);
  var seasonYear = JSON.parse(req.body.sesaons);

  if (data.code === "CL" || data.code === "EC") {
    seasonYear = null;
  }

  const options = {
    method: "GET",
    url: "http://api.football-data.org/v4/competitions/",
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: { season: seasonYear },
    },
  };

  const result = transcodeSeason.find(({ year }) => year === String(seasonYear));

  try {
    const response = await axios.get(options.url + data.code + "/standings", options.config);
    res.render("standing.ejs", {
      standHeader: response.data,
      standRow: response.data.standings[0],
      seasonSelected: result.code
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.post("/statdata", async (req, res) => {
  const options = {
    method: "GET",
    url: `http://api.football-data.org/v4/teams/${req.body.teamId}/matches`,
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: {
        season: req.body.year,
        competitions: req.body.code,
        limit: 100
      },
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    res.render("statdata.ejs", { resultSet: response.data.resultSet, matches: response.data.matches });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }

});

app.post("/teams", (req, res) => {
  console.log(req.body);
  res.render("teams.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
