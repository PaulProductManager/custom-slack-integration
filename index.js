const	express = 	require('express'),
	app =		express(),
	bodyParser = 	require('body-parser'),
	port = 		process.env.PORT || 8080,
	slack = 	require('./slack.js');
let in_header_user_agent = '';
let out_title = 'There was a minor error',
	out_msg = 'error',
	out_button_msg = 'button',
	out_button_url = 'error',
	out_button_fallback = 'error';

app.use(bodyParser.json());

app.post('/', function(req, res){
	// Determine incoming source
	in_header_user_agent = req.get('User-Agent').toLowerCase();

	// Create content, depending on incoming source: GitHub, Jira
	if (in_header_user_agent.indexOf("github") > -1) {
		switch (req.get('X-GitHub-Event')) {
			case 'push':
			case 'fork':
			case 'watch':  // star
			case 'pull_request_review_comment':
			case 'pull_request_review':
			case 'pull_request':
				out_title = '*' + req.body.sender.login + '* requests your code review for PR #<' + req.body.repository.url + '|1234>';
				break;
		}
	}
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

- Escape all single-apostrophe's in the "out_" variables


*/
