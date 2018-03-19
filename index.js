const express = require('express');

const puppeteer = require('puppeteer');

const app = express();

app.get('/getGames', function (req, res) {

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('http://football.org.il/team-details/team-games/?team_id=5981&season_id=19');

        const result = await page.evaluate(() => {
            const data = [];
            const table = document.querySelector('.table_row_group');
            const games = table.querySelectorAll('.table_row');
            const season = "2017-2018";

            games.forEach((game, index) => {
                const res = {};

                const urlParams = game.href.split("=");
                const gameId = urlParams[urlParams.length - 1];

                res._id = `${season}-${index}`;
                res.number = index + 1;
                res.gameId = gameId;
                res.season = season;
                const dateSR = game.childNodes[1].children[0].innerText;
                res.date = game.childNodes[1].innerText.replace(dateSR, '');
                const homeTeamSR = game.childNodes[3].children[0].innerText;
                const teams = game.childNodes[3].innerText.replace(homeTeamSR, '');
                res.homeTeam = teams.split('-')[0].replace(/\r?\n?\t|\r/g, '');
                res.awayTeam = teams.split('-')[1].replace(/\r?\n?\t|\r/g, '');
                const locationSR = game.childNodes[5].children[0].innerText;
                res.location = game.childNodes[5].innerText.replace(locationSR, '');
                const timeSR = game.childNodes[7].children[0].innerText;
                const time = game.childNodes[7].innerText.replace(timeSR, '');
                res.time = time === '00:00' ? '' : time;
                const scoreSR = game.childNodes[9].children[0].innerText;
                const score = game.childNodes[9].innerText.replace(scoreSR, '');
                res.score = score === 'טרם נקבעה' ? '' : score;
                res.finished = score !== 'טרם נקבעה';
                data.push(res);
            });
            return data;
        });

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });

});

app.get('/getLeagueTable', function (req, res) {
    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('http://football.org.il/leagues/league/?league_id=45&season_id=19');

        const result = await page.evaluate(() => {
            const leageData = [];
            const table = document.querySelector('.playoff-container');
            const teams = table.querySelectorAll('.table_row');
            teams.forEach((team, index) => {
                const res = {};

                res._id = `0000${index + 1}`;
                const rankSR = team.childNodes[0].children[0].innerText;
                res.rank = parseInt(team.childNodes[0].innerText.replace(rankSR, ''));
                const teamNameSR = team.childNodes[1].children[0].innerText;
                res.teamName = team.childNodes[1].innerText.replace(teamNameSR, '');
                const amountOfGamesSR = team.childNodes[2].children[0].innerText;
                res.amountOfGames = team.childNodes[2].innerText.replace(amountOfGamesSR, '');
                const amountOfMissingGamesSR = team.childNodes[3].children[0].innerText;
                res.amountOfMissingGames = team.childNodes[3].innerText.replace(amountOfMissingGamesSR, '');
                const amountOfWinsSR = team.childNodes[4].children[0].innerText;
                res.amountOfWins = team.childNodes[4].innerText.replace(amountOfWinsSR, '');
                const amountOfTieSR = team.childNodes[5].children[0].innerText;
                res.amountOfTie = team.childNodes[5].innerText.replace(amountOfTieSR, '');
                const amountOfLosesSR = team.childNodes[6].children[0].innerText;
                res.amountOfLoses = team.childNodes[6].innerText.replace(amountOfLosesSR, '');
                const amountOfGolesSR = team.childNodes[7].children[0].innerText;
                res.amountOfGoles = team.childNodes[7].innerText.replace(amountOfGolesSR, '');
                const differenceSR = team.childNodes[8].children[0].innerText;
                res.difference = team.childNodes[8].innerText.replace(differenceSR, '');
                const pointesSR = team.childNodes[9].children[0].innerText;
                res.points = team.childNodes[9].innerText.replace(pointesSR, '');
                leageData.push(res);
            });
            return leageData;
        });

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getPlayerStatistics/:playerId', function (req, res) {

    const playerId = req.params.playerId;

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto(`http://football.org.il/players/player/?player_id=${playerId}`);

        await page.exposeFunction('getPlayerId', () => playerId);

        const result = await page.evaluate(async () => {
            const data = [];
            const table = document.querySelector('.season-games .table_view');
            const games = table.querySelectorAll('.table_row');
            const playerId2 = await window.getPlayerId();
            const season = "2017-2018";
            games.forEach((game, index) => {
                const res = {};

                const urlParams = game.href.split("=");
                const gameId = urlParams[urlParams.length - 1];

                const isKatamonGame = game.childNodes[5].textContent.indexOf('הפועל קטמון ירושלים') > 0;
                const isBogrimGame = game.childNodes[3].textContent.indexOf('נוער') < 0;

                if (isKatamonGame && isBogrimGame) {
                    res._id = `${playerId2}-${season}-${index}`;
                    res.order = index;
                    const dateSR = game.childNodes[1].children[0].innerText;
                    res.date = game.childNodes[1].innerText.replace(dateSR, '');
                    const misgeretSR = game.childNodes[3].children[0].innerText;
                    res.misgeret = game.childNodes[3].innerText.replace(misgeretSR, '');
                    const nameSR = game.childNodes[5].children[0].innerText;
                    res.name = game.childNodes[5].innerText.replace(nameSR, '');
                    res.season = season;
                    res.gameId = gameId;

                    const substitutionTimeSR = game.childNodes[9].children[0].innerText;
                    const substitutionTime = game.childNodes[9].innerText.replace(substitutionTimeSR, '');
                    res.substitutionTime = substitutionTime;
                    if (substitutionTime) {
                        const substitutionOut = game.childNodes[9].querySelector('.change-down');
                        res.substitution = substitutionOut ? 'out' : 'in';
                    } else {
                        res.substitution = '';
                    }
                    const resultSR = game.childNodes[11].children[0].innerText;
                    res.result = game.childNodes[11].innerText.replace(resultSR, '');

                    const yellowCard = game.childNodes[13].querySelector('.card-yellow');
                    res.yellowCards = yellowCard ? 'Yellow' : '';

                    const redCards = game.childNodes[15].querySelector('.card-red');
                    res.redCards = redCards ? 'Red' : '';

                    res.playerId = playerId2;

                    const goalsSR = game.childNodes[17].children[0].innerText;
                    res.goals = game.childNodes[17].innerText.replace(goalsSR, '');


                    data.push(res);
                }
            });
            return data;
        });

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getTeams', function (req, res) {

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('http://football.org.il/leagues/league/?league_id=45&season_id=19');

        const result = await page.evaluate(() => {
            const data = [];
            const table = document.querySelector('.playoff-container');
            const teams = table.querySelectorAll('.table_row');
            teams.forEach((team, index) => {
                const res = {};

                res._id = `0000${index + 1}`;
                const teamNameSR = team.childNodes[1].children[0].innerText;
                res.teamName = team.childNodes[1].innerText.replace(teamNameSR, '');
                data.push(res);
            });
            return data;
        });

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});


app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');





