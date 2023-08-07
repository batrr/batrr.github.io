/*
 * Copyright 2010-2013, Georgiy Korneev (kgeorgiy@kgeorgiy.info)
 *
 * The original location of this file is
 * $URL: https://neerc.ifmo.ru/svn/projects/trunk/contests/standings/resources/finalizer/standings.js $
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

// Appearance
var currentLine = 3;
var totalLines = 100;
var freezeTime = 3 * 60 * 60 * 1000; // ms

// Visual appearance
var acceptedColor = "#50ff50";
var rejectedColor = "#ff5050";
var notSubmittedColor = "#5050ff";
var unknownResultColor = "#f2b200";
var rowColors = [["#ffffff", "#dddddd"], ["#d0f0ff", "#b9d6e5"]];
var currentTeamColor ="#ffa1ff";

var problemFlashInterval = 300;
var teamFlashInterval = 300;
var teamFloatInterval = 300;
var problemFlashTimes = 2;

// Localization
var locales = {
    en: {
        party           : "Team",
        solved          : "=",
        penalty         : "Time",
        rank            : "Rank"
    },
    ru: {
        party           : "Команда",
        solved          : "=",
        penalty         : "Время",
        rank            : "Место"
    }
}
var locale = locales.en;

var _contest;

function createTableHeader(challenge) {
    var cells = map(challenge.problem, function(problem) {
        return createElement("span", {
            __class: "problem",
            title: problem.name,
            __text: problem.alias
        }, []);
    });

    cells.push(createLocalizedTextNode("span", "solved"));
    cells.push(createLocalizedTextNode("span", "penalty"));
    cells.push(createLocalizedTextNode("span", "rank"));

    return createElement("div", {__class: "header"}, cells);
}

function getActualData(problem) {
    var attempts = problem.attempts;
    if (problem.accepted) {
        return {color: acceptedColor, text: (attempts > 1) ? "+" + (attempts - 1) : "+"};
    } else if (problem.attempts > 0) {
        return {color: rejectedColor, text: "-" + attempts};
    } else {
        return {/*color: notSubmittedColor, */text: "."};
    }
}

function getHiddenData(problem) {
    if (problem.show) {
        return getActualData(problem);
    } else {
        return {color: unknownResultColor, text: "?" + problem.attempts};
    }
}

function createTableRowCell(problem) {
    var data = getHiddenData(problem);
    var node = createTextNodeStyle("span", data.text, "problem bubble");
    node.style.background = gradientBackground(data.color);

    if (problem.current == 1) {
        node.id = "currentNode";
        node.hiddenData = getHiddenData(problem);
        node.actualData = getActualData(problem);
    }
    return node;
}

function createSessionNode(session, color, current) {
    var cols = map(session.problem, createTableRowCell);

    cols.push(createTextNodeStyle("span", session.solved, "solved", current ? "currentSolved" : undefined));
    cols.push(createTextNodeStyle("span", session.penalty, "time", current ? "currentPenalty" : undefined));
    cols.push(createTextNodeStyle("span", session.rank, "rank", current ? "currentRank" : undefined));

    return createElement(
        "div", {
            style: "background: " + gradientBackground2(color),
            __class: "team",
            session: session
        }, [
            createElement(
                "div",
                {style: "overflow: hidden; height: 1.1em"},
                [createTextNodeStyle("span", session.party, "team")]
            ),
            createElement("div", {}, cols)
        ],
        current ? "currentRow" : undefined
    );
}

function compareSession(s1, s2) {
    return (s1.solved == s2.solved)
        ? (s1.penalty == s2.penalty)
            ? (s1.id < s2.id) ? -1 : 1
            : s1.penalty - s2.penalty
        : s2.solved - s1.solved;
}

function createTable(contest) {
    var sessions = contest.session;

    var rows = [
            createTableHeader(contest.challenge[0]),
            createTextNodeStyle("div", "", "rule")
    ];

    var from = Math.max(0, contest.currentSession - currentLine);
    var to = from + Math.min(sessions.length - from, totalLines);

    for (var i = from; i < to; i++) {
        var session = sessions[i];

        var color = (i == contest.currentSession)
            ? currentTeamColor
            : rowColors[session.solved % 2][i % 2];

        rows.push(createSessionNode(session, color, i == contest.currentSession));
    }

    return rows;
}

function Factory() {
    this.create = function (name) {
        if (name == "run") {
            return new Run(this);
        } else if (name == "problem") {
            return new Problem(this);
        } else if (name == "session") {
            return new Session();
        } else if (name == "contest") {
            return new Contest();
        } else if (name == "standings") {
            return new Standings();
        } else {
            return Object();
        }
    }
}

function Standings() {
    this.contest = [];
}
Standings.prototype = new Factory;

function nextTeamRecord(contest) {
    contest.actions.push("next");
    contest.currentSession--;
}

var keysLocked = false;
function lockKeys() {
    keysLocked = true;
}
function unlockKeys(showNext) {
    return function() {
        keysLocked = false;
        showNext();
    }
}
var stopAnimation = false;

function Contest() {
    this.session = [];
    this.update = function () {
        var sessions = this.session;
        forEach(sessions, function(session){
            session.update();
        });
        this.session = sessions.sort(compareSession);

        var prev = {solved: -1, penalty: 0, rank: 0};
        var rank = 0;
        forEach(this.session, function(session) {
            rank++;
            session.rank = prev.rank;
            if (prev.solved != session.solved || prev.penalty != session.penalty) {
                session.rank = rank;
            }
            prev = session;
        });
    };
    this.actions = [];

    this.init = function() {
        this.currentSession = this.session.length - 1;
        this.update();
    };
    this.getCurrentSession = function() {
        return this.session[this.currentSession];
    };
    function nextProblemAnimate(contest, session, mode, showNext) {
        var problem = session.hidden[session.currentHidden];
        problem.current = 1;
        contest.show();
        problem.current = 0;
        problem.show = 1;
        session.currentHidden++;

        contest.actions.push(session);
        contest.actions.push("show");

        var currentNode = $("#currentNode")[0];
        var node = $(currentNode);
        currentNode.style.background = currentTeamColor;

        if (mode != "fast") {
            for (var i = 0; i < problemFlashTimes; i++) {
                animateBackground(node, currentNode.hiddenData.color, dimColor(currentTeamColor, -1), dimColor(problemFlashInterval, -1));
                animateBackground(node, dimColor(currentTeamColor, -1), dimColor(currentNode.hiddenData.color, -1), problemFlashInterval);
            }
        }

        var currentRow = $("#currentRow")[0];
        var teams = $("div.team");
        var from = indexOf(teams, currentRow);

        keysLocked = true;
        animateBackground(node, currentNode.hiddenData.color, currentTeamColor, problemFlashInterval, function() {
            currentNode.innerHTML = currentNode.actualData.text;
            animateBackground(node, currentTeamColor, currentNode.actualData.color, teamFlashInterval);
            currentRow.style.background = currentTeamColor;
            animateBackground($(currentRow), currentTeamColor, currentNode.actualData.color, teamFlashInterval, function() {
                session.update();
                var to = from;
                while (to > 0 && compareSession(session, teams[to - 1].session) < 0) {
                    to--;
                }

                $("#currentPenalty")[0].innerHTML = session.penalty;
                $("#currentSolved")[0].innerHTML = session.solved;
                if (to != from) {
                    $("#currentRank")[0].innerHTML = "?";
                    $(teams[from]).animate({top: teams[to].style.top}, teamFloatInterval);
                    for (var i = to; i < from; i++) {
                        $(teams[i]).animate({top: teams[i + 1].style.top}, teamFloatInterval);
                    }
                }
                animateBackground($(currentRow), currentNode.actualData.color, currentTeamColor, teamFlashInterval, unlockKeys(showNext));
            });
        });
    }

    function nextProblem(contest, session, mode, next) {
        session.hidden[session.currentHidden].show = 1;
        session.currentHidden++;

        contest.actions.push(session);
        contest.actions.push("show");
        if (mode == "show") {
            contest.show();
        } else {
            contest.update();
        }
        next();
    }

    function nextTeamAnimate(contest, mode, showNext) {
        contest.show();

        var teams = $("div.team");
        var timeout = mode == "animate" ? 1000 : 300;
        if (currentLine <= contest.currentSession) {
            var top = teams[1].offsetTop;
            lockKeys();
            for (var i = 0; i < teams.length; i++) {
                if (i == 0) {
                    $(teams[i]).animate({top: top}, timeout, unlockKeys(showNext));
                } else {
                    $(teams[i]).animate({top: top}, timeout);
                }
                if (i < teams.length - 1) {
                    top += teams[i + 1].offsetHeight;
                }
            }
            nextTeamRecord(contest);
        } else {
            nextTeamRecord(contest);
            showNext();
        }
    }

    function nextTeam(contest, mode, next) {
        nextTeamRecord(contest);
        contest.update();

        if (mode == "show") {
            contest.show();
        }
        next();
    }

    var displayDiploma = undefined;
    function hideDiploma() {
        if (displayDiploma) {
            displayDiploma = undefined;
            mainElement.style.display = "";
            diplomaElement.style.display = "none";
        }
    }

    this.lastSolved = -1;
    this.next = function(mode, count, solved) {
        var session = this.getCurrentSession();
        if (stopAnimation || count == 0 || session.solved >= solved || session.stop == 1 && session.currentHidden == session.hidden.length
            || (count > 1 && session.diploma && session.currentHidden == session.hidden.length)) {
            this.show();
            return;
        }

        var event = session.currentHidden < session.hidden.length ? "problem"
                  : (session.diploma && displayDiploma != session.id && logElement.style.display == "none") ? "diploma"
                  : this.currentSession > 0 ? "team" : "done";
        if (event == "done") {
            return;
        }
        hideDiploma();

        var contest = this;
        var hidden = session.hidden[session.currentHidden];
        var oldRank;
        var next = function() {
            if (contest.displayDiploma == undefined) {
                contest.next(mode, count - 1, solved);
            }
            var mark = "=";
            var __class = "";
            var rank = session.rank;
            if (event == "problem") {
                __class = hidden.accepted ? "accepted" : "rejected";
                mark = hidden.alias + (hidden.accepted ? "+" : "-");
                rank = oldRank == session.rank ? oldRank : oldRank + "→" + session.rank;
            } else {
                if (contest.lastSolved != session.solved) {
                    var probs = session.solved == 0 ? "задач"
                              : session.solved == 1 ? "задача"
                              : session.solved <= 4 ? "задачи"
                              : "задач";
                    var th = createTextNodeStyle("th", session.solved + " " + probs);
                    th.colSpan = 6;
                    logTable.appendChild(createElement("tr", {}, [th]));
                }
                contest.lastSolved = session.solved;
            }

            logTable.appendChild(createElement("tr", {__class : __class}, [
                createTextNodeStyle("td", mark, "problem"),
                createTextNodeStyle("td", rank, "rank"),
                createTextNodeStyle("td", session.solved, "solved"),
                createTextNodeStyle("td", session.penalty, "time"),
                createTextNodeStyle("td", session.id.substring(session.id.lastIndexOf(".") + 1), "id"),
                createTextNodeStyle("td", session.party, "party")
            ]));
            if (logElement.style.display != "none") {
                body.scrollTop = body.scrollHeight;
            }
        };
        var showNext = function() {
            contest.show();
            next();
        };

        if (event == "problem") {
            oldRank = session.rank;
            if (mode == "animate" || mode == "fast") {
                nextProblemAnimate(contest, session, mode, showNext);
            } else {
                nextProblem(contest, session, mode, next);
            }
        } else if (event == "diploma") {
            mainElement.style.display = "none";
            diplomaElement.style.display = "";
            displayDiploma = session.id;
            while (diplomaElement.firstChild) {
                diplomaElement.removeChild(diplomaElement.firstChild);
            }
            diplomaElement.appendChild(document.getElementById(session.diploma[0].div[0].id).cloneNode(true));
        } else if (event == "team") {
            if (mode == "animate" || mode == "fast") {
                nextTeamAnimate(contest, mode, showNext);
            } else {
                nextTeam(contest, mode, next);
            }
        }
    }

    this.prev = function(mode, count, solved) {
        hideDiploma();
        while (count-- > 0) {
            if (this.actions.length > 0) {
                var action = this.actions.pop();
                if (action == "show") {
                    var session = this.actions.pop();
                    session.currentHidden--;
                    session.hidden[session.currentHidden].show = 0;
                } else {
                    this.currentSession = Math.min(this.currentSession + 1, this.session.length - 1);
                }
                this.update();
                if (this.session[this.currentSession].solved <= solved) {
                    break;
                }
            }
        }
        if (mode != "hide") {
            this.show();
        }
    }

    function layoutStandings() {
        var header = $(".header")[0];
        var rule = $(".rule")[0];
        rule.style.top = header.offsetHeight;
        header.style.zIndex = 0;
        rule.style.zIndex = 0;

        var teams = $("div.team");
        var top = header.offsetHeight + rule.offsetHeight;
        if (currentLine <= _contest.currentSession) {
            top -= teams[0].offsetHeight;
        }

        forEach(teams, function(team) {
            team.style.top = top + "px";
            team.style.zIndex = -2;
            top += team.offsetHeight;
        });
    }

    function generateStandings() {
        var element = document.getElementById("main");
        if (element.lang != "" && element.lang !== undefined) {
            if (locales[element.lang] !== undefined) {
                locale = locales[element.lang];
            }
        }
        element.innerHTML = "";
        forEach(createTable(_contest), function (row) {
            element.appendChild(row);
        });
    }

    this.show = function() {
        _contest.update();
        generateStandings();
        layoutStandings();
        window.location = '#' + this.getCurrentSession().rank + "-" + this.getCurrentSession().id;
    }

    this.rewind = function(rank, id) {
        var contest = this;
        document.getElementById("main").innerHTML =
            "Rewinding to rank=" + rank + ", id='" + id + "' ...<br>" +
            "Press 'R' to restart from the beginning";
        setTimeout(function() {
            try {
                if (rank) {
                    while (contest.getCurrentSession().rank != rank || (id && contest.getCurrentSession().id != id)) {
                        contest.next("hide", 1, 1000);
                    }
                }
            } finally {
                contest.show();
            }
        }, 0);
    }
}
Contest.prototype = new Factory;

function Session() {
    this.problem = [];
    this.init = function() {
        this.currentHidden = 0;
        this.hidden = filter(this.problem, function(problem){
            return !problem.show;
        });
        this.hidden.sort(
            function (p1, p2) {
                return p1.time - p2.time;
            }
        );
    };
    this.update = function () {
        var session = this;
        session.solved = 0;
        session.penalty = 0;

        forEach(session.problem, function(problem){
            if (problem.show && problem.accepted) {
                session.solved++;
                session.penalty += problem.penalty;
            }
        });
    }
}
Session.prototype = new Factory;

function Problem(session) {
    this.session = session;
    this.run = [];
    this.init = function () {
        this.accepted = this.accepted != "0";
        this.penalty = Number(this.penalty);

        this.time = 0;
        var problem = this;

        if (this.accepted) {
            for (var i = this.run.length - 1; i >= 0 && !this.run[i].accepted; i--) {
                this.run = this.run.slice(0, i);
            }
            this.attempts = this.run.length;
        }

        forEach(this.run, function(run) {
            problem.time = Math.max(problem.time, run.time);
        });

        this.show = this.time <= freezeTime || this.attempts == "0";
    };
}
Problem.prototype = new Factory;

function Run(problem) {
    this.problem = problem;
    this.init = function () {
        this.accepted = this.accepted == "yes";
        this.time = Number(this.time);
    };
}
Run.prototype = new Factory;

var body, mainElement, logElement, logTable, diplomaElement;

function toggleLog() {
    mainElement = document.getElementById("main");
    logTable = document.getElementById("log");
    logElement = document.getElementById("log-div");
    diplomaElement = document.getElementById("diploma");
    body = document.getElementsByTagName("body")[0];
    if (logElement.style.display == "none") {
        logElement.style.display = "";
        mainElement.style.display = "none";
        body.style.overflowY = "scroll";
    } else {
        logElement.style.display = "none";
        mainElement.style.display = "";
        body.style.overflowY = "hidden";
    }
    diplomaElement.style.display = "none";
}

function loadData() {
    toggleLog();
    var standingsElement = document.getElementsByTagName("xml")[0].childNodes[0];
    var standings = xmlToObject(standingsElement, new Factory());

    _contest = standings.contest[0];
    var hash = window.location.hash.substring(1);
    var index = (hash + "-").indexOf('-')
    _contest.rewind(+hash.substr(0, index), hash.substr(index + 1));
}

function handleKeyPress(event) {
    var code = event.keyCode ? event.keyCode : event.which ? event.which : null;
    if (27 == code) { // Escape
        stopAnimation = true;
    }
    if (keysLocked) {
        return;
    }
    stopAnimation = false;
    console.log("KeyCode=" + code);
    if (39 == code || 32 == code || 34 == code) { // Right or space or PgDn
        if (event.ctrlKey) {
            _contest.next(event.shiftKey ? "hide" : "fast", 1000, _contest.getCurrentSession().solved + 1);
        } else {
            _contest.next(event.shiftKey ? "show" : "animate", 1, _contest.getCurrentSession().solved + 1);
        }
    } else if (37 == code || 33 == code) { // Left or PgUp
        if (event.ctrlKey) {
            _contest.prev("hide", 1000, _contest.getCurrentSession().solved - 1);
        } else {
            _contest.prev("animate", 1,  _contest.getCurrentSession().solved - 1);
        }
    } else if (76 == code && event.altKey && event.ctrlKey && event.shiftKey) {  // Alt+Control+Shift+L
        toggleLog();
    } else if (82 == code) { // R
        window.location = '#';
        toggleLog();
        loadData();
    } else if (112 == code) { // F1
        window.alert("Usage:" +
                "\n\tRight or Space: Step forward with animation" +
                "\n\tShift+Right: Step forward without animation (faster)" +
                "\n\tControl+Right: Animate to next number of solved problems or session with attribute stop='1' (fast)" +
                "\n\tShift+Control+Right: Skip to next number of solved problems or session with attribute stop='1' " +
                "\n\tLeft: Step backward " +
                "\n\tControl+Left: Step backward to prev number of solved problems" +
                "\n\tEscape: Stop current animation" +
                "\n\tR: Restart from beginning" +
                "\n\tAlt+Shift+Control+L: show/hide log"
        );
    }
}
function createLocalizedTextNode(name, key) {
    return createTextNodeStyle(name, localize(key), key);
}

function localize(key) {
    var value = locale[key];
    if (value == undefined) {
        value = "???" + key + "???";
    }
    return value;
}
