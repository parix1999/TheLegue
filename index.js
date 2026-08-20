// NPM PACKAGES NODE_MODULES
import express from "express";
import ejs from "ejs";
import axios from "axios";
import bodyParser from "body-parser";
import session from "express-session"; // ADDED
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import 'dotenv/config';

// -------------------------------------------------------------------------------------
// GLOBAL DATA DECLARATION
const app = express();
const port = process.env.PORT || 3000;
const AuthToken = process.env.AUTH_TOKEN;
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
// MIDDLEWARE FOR DATA & SESSION
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true })); // Middleware dati
app.use(bodyParser.json());

// CONFIGURAZIONE EXPRESS-SESSION
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_solo_per_dev",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 2 }, // 2 Ore
  }),
);

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
 
    const idChapions = 2001;
    var filteredLegues = response.data.competitions.filter((item) => item.id !== idChapions);
   
    const idEuropeo = 2018;
    var filteredLegues = filteredLegues.filter((item) => item.id !== idEuropeo);

    res.render("index.ejs", { filteredLegues: filteredLegues });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Errore nel recupero dati");
  }
});

// 1. /comp: RICEVE I DATI DALLA HOME E LI SALVA IN SESSIONE
app.post("/comp", async (req, res) => {
  try {
    const competitionData = JSON.parse(req.body.competition);
    let seasonYear = JSON.parse(req.body.sesaons);

    if (competitionData.code === "CL" || competitionData.code === "EC") {
      seasonYear = null;
    }

    // Salva sempre i dati chiave nella sessione
    req.session.currentComp = {
      code: competitionData.code,       // es. "SA", "PL", "PD"
      seasonYear: String(seasonYear),   // es. "2024"
    };

    res.redirect("/comp");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Errore nel parsing dei dati della competizione");
  }
});

// 2. /comp (GET): MOSTRA LA CLASSIFICA USANDO I DATI DALLA SESSIONE
app.get("/comp", async (req, res) => {
  const transcodeSeason = [
    { year: "2026", code: "2026/27" },
    { year: "2025", code: "2025/26" },
    { year: "2024", code: "2024/25" },
    { year: "2023", code: "2023/24" },
  ];

  const currentComp = req.session.currentComp;

  if (!currentComp || !currentComp.code) {
    return res.redirect("/");
  }

  const options = {
    method: "GET",
    url: "http://api.football-data.org/v4/competitions/",
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: { season: currentComp.seasonYear },
    },
  };

  const seasonYears = transcodeSeason.find(
    ({ year }) => year === String(currentComp.seasonYear),
  );

  try {
    const response = await axios.get(
      options.url + currentComp.code + "/standings",
      options.config,
    );
    res.render("standing.ejs", {
      standHeader: response.data,
      standRow: response.data.standings[0],
      seasonSelected: seasonYears ? seasonYears.code : currentComp.seasonYear,
      seasonYear: currentComp.seasonYear,
      competitionCode: currentComp.code,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Errore nel recupero dati della classifica");
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

// 3. /statdata: RECUPERA L'ANNO/CODICE DALLA SESSIONE SE NON PASSATI
app.all("/statdata", async (req, res) => {
  const currentComp = req.session.currentComp || {};

  const teamId = req.body?.teamId || req.query?.teamId;
  const year = req.body?.year || req.query?.year || currentComp.seasonYear;
  const code = req.body?.code || req.query?.code || currentComp.code;

  if (!teamId) {
    return res.redirect("/comp");
  }

  const options = {
    method: "GET",
    url: `http://api.football-data.org/v4/teams/${teamId}/matches`,
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: {
        season: year,
        competitions: code,
        limit: 100,
      },
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    res.render("statdata.ejs", {
      resultSet: response.data.resultSet,
      matches: response.data.matches,
      // Passiamo i dati della competizione corrente al template EJS per i link
      competitionCode: code,
      seasonYear: year,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Errore nel recupero statistiche squadra");
  }
});

// TO DOOO 
app.post("/teams", (req, res) => {
  console.log(req.body);
  res.render("teams.ejs");
});

// 4. /calendar: RECUPERA COMPID E CODE DALLA SESSIONE SE MANCANTI
app.all("/calendar", async (req, res) => {
  const currentComp = req.session.currentComp;

  // Se l'utente non è mai passato da /comp o la sessione è scaduta
  if (!currentComp || !currentComp.code) {
    return res.redirect("/");
  }

  const compId = req.body?.compId || req.query?.compId || currentComp.code;
  const season = currentComp.seasonYear; // Ora è sicuro al 100%

  const params = {};
  if (season && season !== "null") {
    params.season = season;
  }

  const options = {
    method: "GET",
    url: `http://api.football-data.org/v4/competitions/${compId}/matches`,
    config: {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AuthToken,
      },
      params: params,
    },
  };

  try {
    const response = await axios.get(options.url, options.config);
    const rawMatches = response.data.matches || [];

    // Raggruppamento per giornata (matchday) e formattazione orario italiano
    const groupedMatches = rawMatches.reduce((acc, match) => {
      // Se matchday manca o è null, usa un valore di fallback
      const day = match.matchday || 1;

      if (!acc[day]) {
        acc[day] = [];
      }

      // Converti e formatta la data in orario italiano
      let formattedDate = "";
      if (match.utcDate) {
        const dateObj = new Date(match.utcDate);
        formattedDate = dateObj.toLocaleString("it-IT", {
          timeZone: "Europe/Rome",
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      acc[day].push({
        ...match,
        formattedDate, // Aggiungiamo la stringa formattata
      });

      return acc;
    }, {});

    res.render("calendar.ejs", {
      groupedMatches: groupedMatches, // Passiamo l'oggetto raggruppato
      competition: response.data.competition,
      resultSet: response.data.resultSet,
      seasoncode: response.data.filters,
    });
  } catch (error) {
    console.error("Errore API Calendar:", error.response?.data || error.message);
    res.status(500).send("Errore nel recupero del calendario");
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