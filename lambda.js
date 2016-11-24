'use strict';
const https = require('https');
let apiRequestOptions = {
  hostname: 'netflixroulette.net',
  port: 443,
  path: '/api/api.php',
  method: 'GET'
};

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Alexa Skills Kit sample. ' +
        'Please tell me your favorite color by saying, my favorite color is red';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me your favorite color by saying, ' +
        'my favorite color is red';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Alexa Skills Kit sample. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function getMoviesByDirector(intent, session, callback) {
  const directorSlot = intent.slots.Director;
  const shouldEndSession = false;
    let cardTitle = intent.name;
    let repromptText = '';
    let speechOutput = '';

    if (directorSlot) {
        const director = directorSlot.value.replace(/ /g,'%20');
        let options = Object.assign({}, apiRequestOptions);
        let movieData = ``;
        options.path += `?director=${director}`;
        //load api response
        https.request(options, (response) => {
          console.log(`STATUS: ${response.statusCode}`);

          response.setEncoding('utf8')
          .on('data', (chunk) => {
            movieData += chunk;
          })
          .on('end', () => {
            if(response.statusCode === 200){
                movieData = JSON.parse(movieData);
                let bestMovie = selectBestMovie(movieData);
                cardTitle = bestMovie.show_title;
                speechOutput = `I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.`;
                repromptText = `Would you like to hear the movie summary? Or you can say Stop if you are done.`;
                callback({},
                     buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }else{
              callback({},
                   buildSpeechletResponse(cardTitle, `I was unable to find any movies directed by ${director}.`,
                     `Would you like to try another search? Or you can say Stop if you are done.`, shouldEndSession));
            }
          });
        })
        .on('error', (e) => {
          console.log(`problem with request: ${e.message}`);
          speechOutput = `There was a problem retrieving your results. Please try again.`;
          callback({},
               buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        })
        .end();
    } else {
        speechOutput = repromptText =  `I'm not sure what director you are looking for. Please try again.`;
        callback({},
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }


}

function selectBestMovie(movieList) {
  return movieList[0];
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'MovieByActor') {
      callback({},
           buildSpeechletResponse(intent.name, `Looking for movies starring ${intent.slots.Actor.value}`, 'repromptText', true));
    } else if (intentName === 'MovieByDirector') {
      getMoviesByDirector(intent, session, callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
