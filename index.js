const scraper = require('./tableScraper.js')
const express = require('express');


const app = express();

app.get('/getGames', function (req, res) {
    scraper
        .get('http://mng.football.org.il/Clubs/Pages/TeamGames.aspx?TEAM_ID=5981&SEASON_ID=19', '#print_1 > table')
        .then(function (tableData) {
            let games = [];
            const gamesTable = tableData[0];

            gamesTable.map((game, index) => {
                if (index > 0) {
                    games.push({
                        _id: `0000${index}`,
                        number: parseInt(game[0]),
                        date: game[2],
                        homeTeam: game[4].split('-')[0].replace(/\r?\n?\t|\r/g, ''),
                        awayTeam: game[4].split('-')[1].replace(/\r?\n?\t|\r/g, ''),
                        location: game[6],
                        time: game[8],
                        score: game[10] === 'טרם נקבעה' ? '' : game[10],
                        finished: game[10] !== 'טרם נקבעה'
                    })
                }
            });
            res.send(JSON.stringify(games));

        });
});

app.get('/getLeagueTable', function (req, res) {
    scraper
        .get('http://mng.football.org.il/Clubs/Pages/TeamDetails.aspx?TEAM_ID=5981', '#print_0 > table')
        .then(function (tableData) {
            let leagueTable = tableData[0];
            let league = [];
            leagueTable = leagueTable.filter(team => team[0]);

            leagueTable.map((teamData, index) => {
                if (index > 0) {
                    league.push({
                        _id: `0000${index}`,
                        rank: parseInt(teamData[0]),
                        teamName: teamData[2],
                        amountOfGames: teamData[4],
                        amountOfMissingGames: teamData[6],
                        amountOfWins: teamData[8],
                        amountOfTie: teamData[10],
                        amountOfLoses: teamData[12],
                        amountOfGoles: teamData[14],
                        difference: teamData[16],
                        points: teamData[18]
                    })
                }
            });
            res.send(JSON.stringify(league));
        });
});

app.get('/getTeams', function (req, res) {
    scraper
        .get('http://mng.football.org.il/Clubs/Pages/TeamDetails.aspx?TEAM_ID=5981', '#print_0 > table')
        .then((tableData) => {
            let leagueTable = tableData[0];
            let teams = [];
            leagueTable = leagueTable.filter(team => team[0]);

            leagueTable.map((teamData, index) => {
                if (index > 0) {
                    teams.push({
                        _id: `0000${index}`,
                        teamName: teamData[2]
                    })
                }
            });
            res.send(JSON.stringify(teams));
        });
});

app.get('/getPlayerStatistics/:playerId', function (req, res) {
    const playerId = req.param("playerId");
    scraper
        .get(`http://mng.football.org.il/Leagues/Pages/PlayerDetails.aspx?PLAYER_ID=${playerId}&SEASON_ID=19`, '.BDCTable')
        .then((tableData) => {
            let totalAmountOfGoals = parseInt(tableData[0][5][2]);
            let totalYellowCards = parseInt(tableData[1][1][2]) + parseInt(tableData[1][2][2]);
            let totalRedCards = parseInt(tableData[1][3][2]);
            const gamesData = tableData[2].filter((game) => {
                return game[0].indexOf("/") > 0 && game[4].indexOf("קטמון") > 0
            });
            let gamesPlayed = [];
            const season = "2017-2018";

            gamesData.map((gameData, index) => {
                if (index > 0) {
                    gamesPlayed.push({
                        _id: `${playerId}-${season}-00${index}`,
                        gameDate: gameData[0],
                        misgeret: gameData[2],
                        gameName: gameData[4],
                        gameResult: gameData[10],
                        goals: gameData[16]
                    })
                }
            });

            const playerStatistics = {
                season,
                totalAmountOfGoals,
                totalYellowCards,
                totalRedCards,
                playerId,
                gamesPlayed
            };

            res.send(JSON.stringify(playerStatistics));
        });
});


app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');





