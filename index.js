const express = require('express');

const puppeteer = require('puppeteer');

const app = express();

const SEASON_ID = '20';
const SEASON = '2018-2019';

app.get('/getGames', function (req, res) {

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(`http://football.org.il/team-details/team-games/?team_id=5981&season_id=${SEASON_ID}`);

        const result = await page.evaluate((season) => {
            const data = [];
            const table = document.querySelector('.table_row_group');
            const games = table.querySelectorAll('.table_row');

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
        }, SEASON);

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
        await page.goto(`http://football.org.il/leagues/league/?league_id=45&season_id=${SEASON_ID}`);

        const result = await page.evaluate((season) => {
            const leageData = [];
            const teams = document.querySelectorAll('.playoff-container > .table_row')

            teams.forEach((team, index) => {
                const res = {};

                res._id = `${season}-${index + 1}`;
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
                res.season = season;
                leageData.push(res);
            });
            return leageData;
        }, SEASON);

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});


app.get('/getGamePlayersData/:gameId', function (req, res) {

    const gameId = req.params.gameId;

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(`http://football.org.il/leagues/games/game/?game_id=${gameId}`);

        const result = await page.evaluate((season, game_id) => {

            const numberPattern = /\d+/g;

            const getPlayerData = (player, index, playerStatus, isHome, gameId, season) => {
                const res = {};

                const playerLink = player.parentElement;
                const urlParams = playerLink.href.split("=");
                const playerId = urlParams[urlParams.length - 1];

                res._id = `${season}-${gameId}-${playerId}`;
                res.order = index;
                res.shirtNum = player.querySelector('.number').innerText.match(numberPattern)[0];
                res.playerState = playerStatus;
                res.gameId = gameId;
                res.playerId = playerId;
                res.isHome = isHome;
                res.name = player.querySelector('.name').innerText;
                res.season = season;
                res.yellowCard = getGameEventTime(player, '.yellow');
                res.yellow2Card = getGameEventTime(player, '.yellow2');
                res.redCard = getGameEventTime(player, '.red');
                res.changeDown = getGameEventTime(player, '.change-down');
                res.changeUp = getGameEventTime(player, '.change-up');
                res.goalsTime = getGoalsData(player);
                res.goalsSum = res.goalsTime && JSON.parse(res.goalsTime).length;

                return res;
            };

            const getGameEventTime = (player, eventSelector) => {
                const event = player.querySelector(eventSelector);
                if (event) {
                    const yellowNode = event.innerHTML.split(">");
                    return yellowNode[yellowNode.length - 1];
                }
                return null;
            };

            const getGoalsData = (player) => {
                let eventsText = player.querySelector('.moves').innerText;
                eventsText = eventsText.replace(/שערדקה/g, 'a');
                let goals = eventsText.match(/\b[a](\d*\.?\d+)/g);
                if (goals && goals.length) {
                    goals = goals.map(item => item.replace(/a/g, ""));
                    return JSON.stringify(goals);
                } else {
                    return null;
                }
            };

            const playersData = [];

            const activeHomePlayers = document.querySelectorAll('.home.Active .player');
            const activeAwayPlayers = document.querySelectorAll('.guest.Active .player');

            const benchHomePlayers = document.querySelectorAll('.home.Bench .player');
            const benchAwayPlayers = document.querySelectorAll('.guest.Bench .player');

            const replacementHomePlayers = document.querySelectorAll('.home.Replacement  .player');
            const replacementAwayPlayers = document.querySelectorAll('.guest.Replacement  .player');

            activeHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'active', true, game_id, season));
            });
            activeAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'active', false, game_id, season));
            });

            replacementHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'replacement', true, game_id, season));
            });

            replacementAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'replacement', false, game_id, season));
            });

            benchHomePlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'bench', true, game_id, season));
            });

            benchAwayPlayers.forEach((player, index) => {
                playersData.push(getPlayerData(player, index, 'bench', false, game_id, season));
            });

            return playersData;
        }, SEASON, gameId);

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.get('/getGameStaffData/:gameId', function (req, res) {

    const gameId = req.params.gameId;

    let scrape = async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto(`http://football.org.il/leagues/games/game/?game_id=${gameId}`);


        const result = await page.evaluate((season, game_id) => {

            const getJudgesPosition = (judge) => {
                const position = judge.querySelector('.position').innerText;
                switch (position) {
                    case 'שופט רביעי':
                        return 'judge4';
                    case 'עוזר שופט 2':
                        return 'judge2';
                    case 'עוזר שופט 1':
                        return 'judge1';
                    case 'שופט ראשי':
                        return 'mainJudge';
                    default:
                        return null;
                }
            };

            const homeCoach = document.querySelector('#GAME_COACH_HOME').parentElement.querySelector('.player');
            const awayCoach = document.querySelector('#GAME_COACH_GUEST').parentElement.querySelector('.player');

            res = {
                _id: `${season}-${game_id}`,
                gameId: game_id,
                season: season,
                homeCoach: homeCoach.querySelector('.name').innerText,
                awayCoach: awayCoach.querySelector('.name').innerText,
            };

            const judges = document.querySelector('.judge').querySelectorAll('.player');
            judges.forEach(judge => {
                const name = judge.querySelector('.name').innerText;
                const position = getJudgesPosition(judge);
                if (position) {
                    res[position] = name;
                }
            });


            return res;
        }, SEASON, gameId);

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
        await page.goto(`http://football.org.il/leagues/league/?league_id=45&season_id=${SEASON_ID}`);

        const result = await page.evaluate((season) => {
            const data = [];
            const teams = document.querySelectorAll('.playoff-container > .table_row')

            teams.forEach((team, index) => {
                const res = {};

                res._id = `${season}-${index + 1}`;
                const teamNameSR = team.childNodes[1].children[0].innerText;
                res.teamName = team.childNodes[1].innerText.replace(teamNameSR, '');
                res.season = season;
                data.push(res);
            });
            return data;
        }, SEASON);

        browser.close();
        return result;
    };

    scrape().then((value) => {
        res.send(JSON.stringify(value));
    });
});

app.listen(process.env.PORT || 5000);
console.log('listening on port ', process.env.PORT || 5000, '...');





