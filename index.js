// NPM PACKAGES NODE_MODULES
import express from "express";
import ejs from "ejs";
import axios from "axios";
import bodyParser from "body-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// -------------------------------------------------------------------------------------
// GLOBAL DATA DECLARATION
const app = express();
const port = process.env.PORT || 3000;
const AuthToken = "79a282c9983b455bb083c96a8b3582f7";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------------------------------
// JSON STATIC DATA GIOCATORI FANTA
const jsonPath = path.join(
  __dirname,
  "public",
  "data",
  "giocatori_finali.json",
);
const giocatori = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
// -------------------------------------------------------------------------------------
// MIDDLEWARE FOR DATA
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true })); // Middleware dati
// -------------------------------------------------------------------------------------
// SITE ROUTES BRANCHES
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
      code: "2026/27",
    },
    {
      year: "2025",
      code: "2025/26",
    },
    {
      year: "2024",
      code: "2024/25",
    },
    {
      year: "2023",
      code: "2023/24",
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

  const seasonYears = transcodeSeason.find(
    ({ year }) => year === String(seasonYear),
  );

  try {
    const response = await axios.get(
      options.url + data.code + "/standings",
      options.config,
    );
    res.render("standing.ejs", {
      standHeader: response.data,
      standRow: response.data.standings[0],
      seasonSelected: seasonYears.code,
      seasonYear: seasonYear,
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
        limit: 100,
      },
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    res.render("statdata.ejs", {
      resultSet: response.data.resultSet,
      matches: response.data.matches,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }
});

app.post("/teams", (req, res) => {
  console.log(req.body);
  res.render("teams.ejs");
});

app.post("/calendar", async (req, res) => {

  const options = {
    method: "GET",
    url: `http://api.football-data.org/v4/competitions/${req.body.compId}/matches`,
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: {
        season: req.body.code
      },
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    res.render("calendar.ejs", {
      matches: response.data.matches,
      competition: response.data.competition,
      resultSet: response.data.resultSet,
      seasoncode: response.data.filters
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }

});

app.get("/converciano", (req, res) => {
  const squadre = new Set(giocatori.map((giocatore) => giocatore.Squadra));
  const ruoli = new Set(giocatori.map((giocatore) => giocatore.Ruolo));
  const trend = new Set(giocatori.map((giocatore) => giocatore.Trend));

  res.render("fantaData.ejs", {
    giocatori: giocatori,
    squadre: Array.from(squadre),
    ruoli: Array.from(ruoli),
    trend: Array.from(trend),
  });
});

app.post("/statgiocatore", (req, res) => {

  let playerData = giocatori.find(
    (g) => g.id === req.body.idPlayer && g.Nome === req.body.namePlayer,
  );

  if (!playerData) {
    res.status(500).send("Dati Giocatore non trovati");
  } else {
    res.render("dettagliogiocatore.ejs", {
      playerData: playerData,
    });
  }
});

// -------------------------------------------------------------------------------------

// PORT SITE
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
