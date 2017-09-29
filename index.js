const scraper = require('./tableScraper.js')
const express = require('express');
const app = express();

app.get('/getGames', function (req, res) {
    scraper
        .get('http://football.org.il/Clubs/Pages/TeamGames.aspx?TEAM_ID=5981&SEASON_ID=19', '#print_1 > table')
        .then(function (tableData) {
            let games = [];
            const gamesTable = tableData[0];

            gamesTable.map((game, index) => {
                if (index > 0) {
                    games.push({
                        _id: `0000${index}`,
                        number: game[0],
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


app.get('/getLeageTable', function (req, res) {
    scraper
        .get('http://football.org.il/Clubs/Pages/TeamDetails.aspx?TEAM_ID=5981', '#print_0 > table')
        .then(function (tableData) {
            const leageTable = tableData[0];
            let leage = [];
            leageTable.map((game, index) => {
                if (index > 0) {
                    leage.push({
                        _id: `0000${index}`,
                        rank: game[0],
                        teamName: game[2],
                        amountOfGames: game[4],
                        amountOfMissingGames: game[6],
                        amountOfWins: game[8],
                        amountOfTie: game[10],
                        amountOfLoses: game[12],
                        amountOfGoles: game[14],
                        difference: game[16],
                        points: game[18]
                    })
                }
            });
            res.send(JSON.stringify(leage));
        });
});

app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT, '...')





