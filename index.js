const	express = 	require('express'),
	app =		express(),
	bodyParser = 	require('body-parser'),
	port = 		process.env.PORT || 8080,
	slack = 	require('./slack.js');
const USER_MAP = [
	{
		'email': 'paul.promoboxx@gmail.com',
		'slack': '@U8KG8HQJ2',
		'jira': 'XXXXXXXXXX',
		'github': 'PaulProductManager'
	},
	{
		'email': 'john.promoboxx@gmail.com',
		'slack': '@U9159L4KE',
		'jira': 'XXXXXXXXXX',
		'github': 'hujambo-dunia'
	}
];

let get_subset = [];
let in_header_user_agent = '';
let out_title = 'There was a minor error',
	out_channel = [],
	out_msg = 'error',
	out_button_msg = 'button',
	out_button_url = 'error',
	out_button_fallback = 'error';
let out_error = [];

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
				// create msg
				out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.pull_request.html_url + '|' + req.body.pull_request.number + '>';

				// get slack-channel users
				for (var r = 0; r < req.body.pull_request.requested_reviewers.length; r++) {
					get_subset = USER_MAP.filter(function(e) {return e.github == req.body.pull_request.requested_reviewers[r].login;});
					if (get_subset.length === 1) {
						out_channel.push(get_subset[0].slack);
					} else if (get_subset.length === 0) {
						out_error.push('User not found with Github ID: ' + req.body.pull_request.requested_reviewers[r].login);
					} else {
						out_error.push('Multiple users founds with Github ID: ' + req.body.pull_request.requested_reviewers[r].login);
					}
				}
				// out_title = out_title + " *** " + out_channel.join(', ');		// for testing
				break;
		}
	}

	if (in_header_user_agent.indexOf("atlassian") > -1) {
		var flattenObject = function(req) {
			var toReturn = {};

			for (var i in ob) {
				if (!ob.hasOwnProperty(i)) continue;

				if ((typeof ob[i]) == 'object' && ob[i] !== null) {
					var flatObject = flattenObject(ob[i]);
					for (var x in flatObject) {
						if (!flatObject.hasOwnProperty(x)) continue;

						toReturn[i + '.' + x] = flatObject[x];
					}
				} else {
					toReturn[i] = ob[i];
				}
			}
			return toReturn;
		};
		out_title = 'out: ' + flattenObject;
		out_channel.push('@U9159L4KE');
	}

	// Send message
	for (var s = 0; s < out_channel.length; s++) {
		slack.sendMessage({
			'channel': out_channel[s],
			'text': out_title
			// 'attachments': [
			// 	{
			// 		'text': '',
			// 		'fallback': 'You are unable to choose an action',
			// 		'callback_id': 'wopr_game',
			// 		'color': '#ffffff',
			// 		'attachment_type': 'default',
			// 		'actions': [
			// 			{
			// 				'name': 'github',
			// 				'text': out_button_msg,
			// 				'style': 'primary',
			// 				'type': 'button',
			// 				'value': 'pull_request'
			// 			}
			// 		]
			// 	}
			// ]
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


/*
Tasks:

- Completed Github integration
	- Completed PR format
		+ Captured correct PR 'author' variable in the out_title
		+ Captured correct PR variables into the out_title
		- Captured correct PR variable into the out_channel(s) / reviewer(s)
				+ Captured Github-Username variaable
				- Matched with outgoing Slack-Channel-Name variable
	- Completed PR-comment format
		- Captured correct PR variable(s) into the out_channel(s) / reviewer(s)
	- Completed PR-approval/reject format
		- Captured when an "approval/reject" occurs
			- If rejected, shows up as "red"
		- Captured correct PR variable(s) into the out_channel(s) / reviewer(s)


- Escape all single-apostrophe's in the "out_" variables

- Create user-friendly UI where anyone can "link" up new users with their Slack-Channel-ID and Jira-ID (and Github-ID)
	- see: https://api.slack.com/methods/channels.list


- JIra Issue-Related Events FQL Filter:
	=> (summary ~ currentUser() OR description ~ currentUser() OR comment ~ currentUser())


*/
