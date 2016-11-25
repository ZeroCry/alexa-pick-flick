'use strict';
const Alexa = require('alexa-app');
const app = new Alexa.app('pick-flick');
const app_name = 'Pick Flick';
const https = require('https');
const apiRequestOptions = {
  hostname: 'netflixroulette.net',
  port: 443,
  path: '/api/api.php',
  method: 'GET'
};

app.launch(function(req, res) {
  var prompt = 'For movie information, ask for a recomendation by director or actor.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

app.error = function(exception, request, response) {
    response.say("Sorry, I was unable to handle that request. Please try again");
};

app.intent('MovieByDirector', {
  'slots': {
    'Director': 'AMAZON.LITERAL'
  },
  'utterances': ['{find|pick|get|recommend} {movies|shows|a movie|show} directed by {onename|two name|three word name|Director}']
},
  getMoviesByDirectorOrActor
);

app.intent('MovieByActor', {
  'slots': {
    'Actor': 'AMAZON.LITERAL'
  },
  'utterances': ['{find|pick|get|recommend|choose} {movies|shows|a movie|show} {starring|with|featuring} {onename|two name|three word name|Actor}']
},
  getMoviesByDirectorOrActor
);

app.intent('PickSomethingElse', {
  'utterances': ['{find|pick|get|recommend|choose} {something else|another|something different|next|next option}','{next|skip|no}']
},
  getNextOptionFromList
);

app.intent('AMAZON.StopIntent', {}, (req,res) => {
  res.clearSession();
  res.say(`Thank you for using ${app_name}`);
});

app.intent('AMAZON.HelpIntent', {}, (req,res) => {
  const msg = `${app_name} can recommend movies from the Netflix Roulette database for a given actor or director.
    Try questions like:<break/>
    'Recommend a movie starring Tom Hanks'<break/>
    'Give me a movie directed by Martin Scorsese'`;
    res.card({
      type: 'Simple',
      title: `Welcome to ${app_name}`,
      content: msg
    });
  res.say(msg);
});


function getMoviesByDirectorOrActor(req, res) {
try{
  const type = (req.data.request.intent.name == 'MovieByDirector' ? 'Director':'Actor');
  const search = req.slot(type);
  const query = `?${type.toLowerCase()}=${search.replace(/ /g,'%20')}`;
    let reprompt = `Sorry, I'm not sure what ${type} you are looking for. Please try again.`;
    let options = Object.assign({}, apiRequestOptions);
    options.path += query;
    //load api response
    executeAPIRequest(options, (err, movieData) => {
      if(err || !movieData || !movieData.length){
        res.say( `I was unable to find any movies ${type == 'Director'? 'directed by':'starring'} ${search}.
        Please request another ${type}, or say Stop if you are done.`)
        .reprompt(`Would you like to try another search? Or you can say Stop if you are done.`)
        .shouldEndSession(false)
        .send();
      }else{
        sendMovieRecommendation(movieData, res);
      }
    });
      return false;
    }catch(e){
        res.say(reprompt).reprompt(reprompt).shouldEndSession(false).send();
        return true;
    }
}

function executeAPIRequest(options, callback){
  let movieData = ``;
  https.request(options, (response) => {
    response.setEncoding('utf8')
    .on('data', (chunk) => {
      movieData += chunk;
    })
    .on('end', () => {
      if(response.statusCode === 200){
          movieData = JSON.parse(movieData);
          callback(null, movieData);
      }else{
        callback(response);
      }
    });
  })
  .on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
    callback(e);
  })
  .end();
}

function getNextOptionFromList(req, res) {
  const noDataResponse = 'Sorry, I do not have any additional movie options for this request. Please request a different actor or director';
  let movieData = null;
  try {
    movieData = req.session('activeMovieArray');
    if(!movieData || movieData.length === 0){
      res.say(noDataResponse);
      return true;
    }
    sendMovieRecommendation(movieData, res);
  }catch(e){
    res.say(noDataResponse);
  }
}

function sendMovieRecommendation(movieData, res) {
  let bestMovie = selectBestMovie(movieData);
  let nextStepMsg = `I have no more recommendations for this search. You may request a different actor or director `;
  if(movieData.length > 0){
    const singular = movieData.length === 1;
    nextStepMsg = `There ${singular ? 'is':'are'} ${movieData.length} other option${singular?'':'s'}, say 'Pick something else'`;
  }

  res
    .say(`I recommend ${bestMovie.show_title} from ${bestMovie.release_year}, which has a rating of ${bestMovie.rating} stars.
      A full description is shown in your Alexa app. ${nextStepMsg} or Stop if you are done`)
    .card({
        type: "Standard",
        title: `${bestMovie.show_title} (${bestMovie.release_year})`,
        text:  `${bestMovie.summary}
          Runtime: ${bestMovie.runtime}
          Rating: ${bestMovie.rating}`,
        image: {
          smallImageUrl: bestMovie.poster.replace('http:','https:')
        }
      })
    .reprompt(`You can make another request or you can say Stop if you are done.`)
    .session('activeMovie', bestMovie)
    .session('activeMovieArray', movieData)
    .shouldEndSession(false)
    .send();
}

function selectBestMovie(movieList) {
  return movieList && movieList.shift();
}

module.exports = app;
module.change_code=1;
exports.handler = app.lambda();
