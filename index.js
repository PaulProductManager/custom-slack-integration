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
    'github': 'PaulProductManager'
  },
  {
    'email': 'john.promoboxx@gmail.com',
    'slack': '@U9159L4KE',
    'jira': '[~john.promoboxx]',
    'github': 'hujambo-dunia'
  },
  {
    'email': 'michelle@promoboxx.com',
    'slack': '@U7JQUB6JX',
    'jira': '[~michelle]',
    'github': 'XXXXXXXXXXXX'
  }
];

let use_subset,
    get_subset = [];
let in_header_user_agent = '',
    in_sender_slack;
let out_title = 'There was a minor error',
    out_channel_blob,
    out_channel = [],
    out_color = '#ffffff',
    out_msg = 'error',
    out_button_msg = 'button',
    out_button_url = 'error',
    out_button_fallback = 'error';
let out_error = [];
let jira_mention_regex = /\[\~[a-zA-Z0-9.@_' ]+\]/g;

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
        out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.repository.url + '|1234>';
        break;
      case 'pull_request_review_comment':
      case 'pull_request_review':
      case 'pull_request':
        // Create msg
        out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.pull_request.html_url + '|' + req.body.pull_request.number + '>';
        out_color = '#FFFF00';
        out_title = out_title + ' *** ' + out_color;

        // Create list of users: get github Requested Reviewers
        for (var r = 0; r < req.body.pull_request.requested_reviewers.length; r++) {
          out_channel.push(req.body.pull_request.requested_reviewers[r].login);
        }

        // Unique mentions only
        out_channel = uniq(out_channel);

        // Remove sender from list
        out_channel = out_channel.filter(function(a){return a !== '[~' + req.body.sender.login + ']'});

        // Get slack-channel users
        out_channel = convertToSlack(USER_MAP, "github", out_channel, true);

        break;
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
        if (out_channel) {    // if not empty array, perform more transforms
          // TESTING ONLY
          out_title = out_title + ' *** before: ' + out_channel.join();

          // Unique mentions only
          out_channel = uniq(out_channel);

          // Remove sender from list
          out_channel = out_channel.filter(function(a){return a !== '[~' + req.body['issue']['fields']['comment']['comments'][req.body['issue']['fields']['comment']['comments'].length-1]['author']['name'] + ']'});

          // Get slack-channel users
          out_channel = convertToSlack(USER_MAP, "jira", out_channel, true);
        }
        break;

        // Convert Jira-to-Slack
    }



    // TESTING ONLY
    // out_channel = [];
    // out_channel.push('@U9159L4KE');
  }

  // BETA-VERSION ONLY: Remove Slack channels that are not Beta Users
  // if (out_channel) {
  //  use_subset = null;
  //  get_subset = [];
  //   // out_channel = USER_MAP.filter(function(e) {return e.github == req.body.pull_request.requested_reviewers[r].login;});
  //   for (var c = 0; c < out_channel.length; c++) {
   //    use_subset = USER_MAP.filter(function(e) {return e.slack == out_channel[c];});
   //    get_subset.push(use_subset);
   //  }
  // }

  // Send message
  for (var s = 0; s < out_channel.length; s++) {
    slack.sendMessage({
      'channel': out_channel[s],
      'text': out_title,
      'attachments': [
       {
      //    'text': '',
      //    'fallback': 'You are unable to choose an action',
      //    'callback_id': 'wopr_game',
         'color': out_color,
         'attachment_type': 'default'
      //    'actions': [
      //      {
      //        'name': 'github',
      //        'text': out_button_msg,
      //        'style': 'primary',
      //        'type': 'button',
      //        'value': 'pull_request'
      //      }
      //    ]
       }
      ]
    });
  }

  res.sendStatus(200);
});
//'*<' + req.body.sender.url + '|' + req.body.sender.login + '>* requests your code review for Pull Request <' + req.body.repository.url + '|' + req.body.repository.name + '>';
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
	/* where...
							is_beta			=		will remove non-Beta Users from list
	*/
  let out_arr = [],
      get_subset = [];

  for (var s = 0; s < in_obj.length; s++) {
    get_subset = in_map.filter(function(e) {return e[in_type] == in_obj[s];});    // LOGIN NEEDS TO BE CHANGED
    if (get_subset.length === 1) {
      out_arr.push(get_subset[0].slack);
    } else if (get_subset.length === 0) {
      // out_error.push('User not found with Github ID: ' + in_obj[s].login);
    } else {
      // out_error.push('Multiple users found with Github ID: ' + in_obj[s].login);
    }
  }


  // for (var r = 0; r < req.body.pull_request.requested_reviewers.length; r++) {
  //   get_subset = USER_MAP.filter(function(e) {return e.github == req.body.pull_request.requested_reviewers[r].login;});
  //   if (get_subset.length === 1) {
  //     out_channel.push(get_subset[0].slack);
  //   } else if (get_subset.length === 0) {
  //     out_error.push('User not found with Github ID: ' + req.body.pull_request.requested_reviewers[r].login);
  //   } else {
  //     out_error.push('Multiple users found with Github ID: ' + req.body.pull_request.requested_reviewers[r].login);
  //   }
  // }


  return out_arr;
}

/*
Tasks:

- completed Jira Integration
  - completed Comment created/updated path
    + made variable names friendlier
    - created final out_channel array
    - removed comments / code cleanup
  - completed Issue created/update path
    - created final out_channel array
- completed Github Integration
  - added pull_request_review::approved pathway
    - added "green" color
    - added out_channel array
    - added out_title
  - added pull_request_review::change_requested pathway
    - added "yellow" color
    - added out_channel array
    - added out_title
  - added pull_request_review::rejected pathway
    - added "red" color
    - added out_channel array
    - added out_title
    - added out_channel array
    - added out_title
- created Universal function to remove in_sender_slack channel from the out_channel before being sent to Slack
- created Universal function to filter Beta Users Only before moving to send-message portion
- created Universal single-apostrophe escape function in the "out_" variables



*/
