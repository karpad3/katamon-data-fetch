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


app.get('/getLeagueTable', function (req, res) {
    scraper
        .get('http://football.org.il/Clubs/Pages/TeamDetails.aspx?TEAM_ID=5981', '#print_0 > table')
        .then(function (tableData) {
            let leagueTable = tableData[0];
            let league = [];
            leagueTable = leagueTable.filter(team => team[0]);

            leagueTable.map((teamData, index) => {
                if (index > 0) {
                    league.push({
                        _id: `0000${index}`,
                        rank: teamData[0],
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

app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');





