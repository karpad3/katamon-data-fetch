const scraper = require('./tableScraper.js')
const express = require('express');
const xray = require('x-ray')();


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

app.get('/getPlayerStatistics/:playerId', function (req, res) {
    const playerId = req.param("playerId");

    xray(`http://mng.football.org.il/Leagues/Pages/PlayerDetails.aspx?PLAYER_ID=${playerId}`, '#print_1 > table', [{
        games: xray('.BDCItemStyle, .BDCItemAlternateStyle', [{
            date: 'td:nth-child(1)',
            misgeret: 'td:nth-child(3)',
            name: 'td:nth-child(5)',
            substitutionTime: 'td:nth-child(9) td',
            substitution: 'td:nth-child(9) img@src',
            result: 'td:nth-child(11)',
            yellowCards: 'td:nth-child(13) img@src',
            redCards: 'td:nth-child(15) img@src',
            goals: 'td:nth-child(17)',
        }])
    }])
    ((err, data) => {
        let fetchedGames = data[0].games;
        fetchedGames = fetchedGames.filter((game) => {
            return game.name.indexOf('קטמון') > 0
        });

        let gamesPlayed = [];
        getRedCardsData = (redData) => {
            if (!redData) {
                return '';
            }
            if (redData.indexOf('yellow2') > 0) {
                return '2 yellows';
            } else {
                return 'red';
            }
        };
        const season = "2017-2018";

        fetchedGames.map((game, index) => {
            gamesPlayed.push({
                _id: `${playerId}-${season}-${index}`,
                order: index,
                date: game.date,
                misgeret: game.misgeret,
                name: game.name,
                season,
                substitutionTime: game.substitutionTime || '',
                substitution: (game.substitution) ? ((game.substitution.indexOf('red') > 0) ? 'out' : 'in') : '',
                result: game.result,
                yellowCards: game.yellowCards ? 'Yellow' : '',
                redCards: (game.redCards) ? ((game.redCards.indexOf('yellow2') > 0) ? '2 yellows' : 'red') : '',
                playerId: playerId,
                goals: game.goals
            });
        });

        res.send(JSON.stringify(gamesPlayed));
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


app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');





