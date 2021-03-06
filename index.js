const express =   require('express'),
  app =   express(),
  bodyParser =  require('body-parser'),
  port =    process.env.PORT || 8080,
  slack =   require('./slack.js');
const USER_MAP = [
  {
    'email': 'paul.promoboxx@gmail.com',
    'slack': '@U8KG8HQJ2',
    'jira': '[~admin]',
    'github': '@PaulProductManager'
  },
  {
    'email': 'john.promoboxx@gmail.com',
    'slack': '@U9159L4KE',
    'jira': '[~john.promoboxx]',
    'github': '@hujambo-dunia'
  },
  {
    'email': 'michelle@promoboxx.com',
    'slack': '@U7JQUB6JX',
    'jira': '[~michelle]',
    'github': '@XXXXXXXXXXXX'
  },
  {
    'email': 'jake@promoboxx.com',
    'slack': '@U8XKWD2T1',
    'jira': '[~jake]',
    'github': '@jaj2610'
  },
  {
    'email': 'corey@promoboxx.com',
    'slack': '@U0DRRL7EZ',
    'jira': '[~corey]',
    'github': '@cpsoinos'
  },
  {
    'email': 'justin@promoboxx.com',
    'slack': '@U894K2NHX',
    'jira': '[~justin]',
    'github': '@jhilde'
  },
  {
    'email': 'joseph@promoboxx.com',
    'slack': '@U0CR44TDY',
    'jira': '[~joseph]',
    'github': '@josephware'
  }
];

let use_subset,
    get_subset = [];
let in_header_user_agent = '',
    in_sender_slack;
let out_title = 'There was a minor error',
    out_channel_blob = '',
    out_channel = [],
    out_color = '#e8e8e8',
    out_msg = 'error',
    out_button_msg = 'button',
    out_button_url = 'error',
    out_button_fallback = 'error';
let out_error = [];
let jira_mention_regex = /\[\~[a-zA-Z0-9.@_' ]+\]/g;
let github_mention_regex = /\@[a-zA-Z0-9.@_'-]+/g;


app.use(bodyParser.json());

app.post('/', function(req, res){
  out_channel = [];
  get_subset = [];

  // Determine incoming source
  in_header_user_agent = req.get('User-Agent').toLowerCase();

  // Create content, depending on incoming source: GitHub, Jira

  if (in_header_user_agent.indexOf("github") > -1) {
    switch (req.get('X-GitHub-Event')) {
      case 'push':
      case 'fork':
      case 'watch':  // star
        // out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.repository.url + '|1234>';
        break;
      case 'pull_request_review_comment':
      case 'issue_comment':
        // Create msg
        // out_title = '*' + req.body.sender.login + '* mentioned you in a Comment for PR #<' + req.body.issue.pull_request.html_url + '|' + req.body.issue.number + '>';
        out_title = '*' + req.body.sender.login + '* mentioned you in PR #<' + req.body.issue.pull_request.html_url + '|' + req.body.issue.number + '>';

        // Look for Github Mentions within the Comment-Body
        out_channel_blob = req.body.comment.body;
        out_channel = out_channel_blob.match(github_mention_regex);

        break;
      case 'pull_request_review':
      case 'pull_request':
      	if (req.body.action != 'closed') {
	        // Create msg
	        out_title = '*' + req.body.sender.login + '* mentioned you in PR #<' + req.body.pull_request.html_url + '|' + req.body.pull_request.number + '>';

	        // Look for Github Mentions within the Description-Body
	        out_channel_blob = req.body.pull_request.body;
	        out_channel = out_channel_blob.match(github_mention_regex);

	        // Create list of users: get github Requested Reviewers
	        for (var r = 0; r < req.body.pull_request.requested_reviewers.length; r++) {
	          out_channel.push('@' + req.body.pull_request.requested_reviewers[r].login);
	        }
      	}

        break;
    }

    if (out_channel) {
      // Unique mentions only
      out_channel = uniq(out_channel);

      // Remove sender from list
      out_channel = out_channel.filter(function(a){return a !== req.body.sender.login});

      // Get slack-channel users
      out_channel = convertToSlack(USER_MAP, "github", out_channel, true);
    }
  }



  if (in_header_user_agent.indexOf("atlassian") > -1) {
    switch (req.body['webhookEvent']) {
      case 'jira:issue_created':
      case 'jira:issue_updated':
        // Create msg
        out_title = '*' + req.body['user']['displayName'] + '* mentioned you in description for Jira #<' + req.body['issue']['fields']['status']['iconUrl'] + 'browse/' + req.body['issue']['key'] + '|' + req.body['issue']['key'] + '>';
      case 'comment_created':
      case 'comment_updated':
        // Create msg
        out_title = '*' + req.body['user']['displayName'] + '* mentioned you in comment for Jira #<' + req.body['issue']['fields']['status']['iconUrl'] + 'browse/' + req.body['issue']['key'] + '?focusedCommentId=' + req.body['issue']['fields']['comment']['comments'][req.body['issue']['fields']['comment']['comments'].length-1]['id'] + '#comment-' + req.body['issue']['fields']['comment']['comments'][req.body['issue']['fields']['comment']['comments'].length-1]['id'] + '|' + req.body['issue']['key'] + '>';

        // Only look for Jira Mentions in the most recent comment
        out_channel_blob = out_channel_blob + ' ' + req.body['issue']['fields']['comment']['comments'][req.body['issue']['fields']['comment']['comments'].length-1]['body'];
        out_channel = out_channel_blob.match(jira_mention_regex);

        if (out_channel) {
          // Unique mentions only
          out_channel = uniq(out_channel);

          // Remove sender from list
          out_channel = out_channel.filter(function(a){return a !== '[~' + req.body['issue']['fields']['comment']['comments'][req.body['issue']['fields']['comment']['comments'].length-1]['author']['name'] + ']'});

          // Get slack-channel users
          out_channel = convertToSlack(USER_MAP, "jira", out_channel, true);
        }
        break;
    }
  }

  // Send message
  for (var s = 0; s < out_channel.length; s++) {
    slack.sendMessage({
      'channel': out_channel[s],
      'attachments': [
       {
				'text': out_title,
				'color': out_color
       }
      ]
    });
  }

  res.sendStatus(200);
});

app.get('/', function(req, res){
  res.send('hello!');
});

app.listen(port, function() {
  console.log('running on http://localhost:' + port);
});

function uniq(a) {
  return a.sort().filter(function(item, pos, ary) {
      return !pos || item != ary[pos - 1];
  })
}



function convertToSlack(in_map, in_type, in_obj, is_beta) {
	/* where... is_beta			=		will remove non-Beta Users from list */
  let out_arr = [],
      get_subset = [];

  for (var s = 0; s < in_obj.length; s++) {
  	// Match by data-source type
    get_subset = in_map.filter(function(e) {return e[in_type] == in_obj[s];});

    if (get_subset.length === 1) {
      out_arr.push(get_subset[0].slack);

	    // If app is in Beta testing, then only add Beta users to the output array
	    // (Beta users same as User Map until we have single-sign-on mapping feature implemented)
	    if (is_beta) {
	    	for (var b = 0; b < in_map.length; b++) {
	    		if (in_map[b].slack == get_subset[0]) {
	    			out_arr.push(get_subset[0].slack);
	    		}
	    	}
	    } else {	// do not check for Beta users
	    	out_arr.push(get_subset[0].slack);
	    }

    } else if (get_subset.length === 0) {
      // out_error.push('User not found with Github ID: ' + in_obj[s].login);
    } else {
      // out_error.push('Multiple users found with Github ID: ' + in_obj[s].login);
    }
  }
  return out_arr;
}

/**************************************************/
/* VERSION 1 - Left for this version 						  */
/**************************************************/

/*
Tasks:
- created Universal function to filter Beta Users Only before moving to send-message portion
- created Github Description & Comment fields check 'blob' check
- created Universal single-apostrophe escape function in the "out_" variables
*/

/**************************************************/
/* VERSION 2 - Color-coded slack-channel messages */
/**************************************************/

/* (1) Pull Request logic for different "review.state" values (eg. "approved", etc) */
// out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.pull_request.html_url + '|' + req.body.pull_request.number + '>';

/* (2) Pull Request color-coded logic for "review.state" values (eg. "approved", etc) */
// out_color = '#43c681';   // green
// out_color = '#ffb400';   // yellow
// out_color = '#ff3000';   // red


/**************************************************/
/* VERSION 3 - single-sign-on 	  							  */
/**************************************************/

// single-sign-on mapping feature implemented


