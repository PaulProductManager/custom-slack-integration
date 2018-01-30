const	express = 	require('express'),
	app =		express(),
	bodyParser = 	require('body-parser'),
	port = 		process.env.PORT || 8080,
	slack = 	require('./slack.js');
// const USER_MAP = {
// 	'hujambo-dunia': 'michelle'
// };
let in_header_user_agent = '';
let out_title = 'There was a minor error',
	out_channel = [],
	out_msg = 'error',
	out_button_msg = 'button',
	out_button_url = 'error',
	out_button_fallback = 'error';

app.use(bodyParser.json());

app.post('/', function(req, res){
	out_channel = [];
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
				out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.pull_request.html_url + '|' + req.body.pull_request.number + '>';
				// for (reviewer in req.body.pull_request.requested_reviewers) {
				for (r = 0; r < req.body.pull_request.requested_reviewers.length) {
					// if (reviewer.login == 'hujambo-dunia') {
						// out_channel.push(req.body.pull_request.requested_reviewers[0].login);			// works, but hardcoded
						out_channel.push(req.body.pull_request.requested_reviewers[r].login);			// works, but hardcoded
						// out_channel.push(reviewer[0].login);			// fails, but hardcoded
						// out_channel.push(reviewer["login"]);			// fails....NEXT UP:
						// 			1- double-check the object NAME and PLACEMENT IN THE TREE
						//			2- try using numerals to call the object as an array
						out_channel.push('TEST.USERA.length:' + req.body.pull_request.requested_reviewers.length);		// works.
						out_channel.push('TEST.USERB.length:' + req.body.pull_request.requested_reviewers.length);		// works...
						out_channel.push('TEST.USERC.length:' + req.body.pull_request.requested_reviewers.length);		// works.....
					// }
				}
				out_title = out_title + " *** " + out_channel.join(', ');
				break;
		}
	}
	//https://github.com/Promoboxx/pbxx2cp/pull/4570 and https://github.com/Promoboxx/pbxx2cp/pull/4570 please
	// Send message
	slack.sendMessage({
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

*/
