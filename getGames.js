const scraper = require('table-scraper');
scraper
    .get('http://football.org.il/Clubs/Pages/TeamGames.aspx?TEAM_ID=5981&SEASON_ID=19')
    .then(function (tableData) {
        let games = [];
        const gamesTable = tableData[41];

        gamesTable.map((game, index) => {
            if (index > 0) {
                games.push({
                    number: game[0],
                    date: game[2],
                    homeTeam: game[4].split('-')[0].replace(/\r?\n?\t|\r/g, ''),
                    awayTeam: game[4].split('-')[1].replace(/\r?\n?\t|\r/g, ''),
                    location: game[6],
                    time: game[8],
                    score: game[10] === 'טרם נקבעה' ? '' : game[10]
                })
            }
        });
        //console.log(games);
        return JSON.stringify(games);

    });

//
// scraper
//     .get('http://football.org.il/Leagues/Pages/LeagueDetails.aspx?LEAGUE_ID=45&SEASON_ID=19')
//     .then(function (tableData) {
//         const leageTable = tableData.filter(table => table && table.length === 19)[0];
//         let leage = [];
//         leageTable.map((game, index) => {
//             if (index > 0) {
//                 leage.push({
//                     rank: game[0],
//                     teamName: game[2],
//                     amountOfGames: game[4],
//                     amountOfMissingGames: game[6],
//                     amountOfWins: game[8],
//                     amountOfTie: game[10],
//                     amountOfLoses: game[12],
//                     amountOfGoles: game[14],
//                     difference: game[16],
//                     points: game[18]
//                 })
//             }
//         });
//         console.log(leage);
//     });
