package action

func init() {
	// 注册API请求动作
	// 配置格式：{"type":"api", "config":{"url":"http://...", "method":"POST", ...}}
	GlobalActionFactory.Register("api", func() Action {
		return &APIAction{}
	})

	// 注册邮件发送动作
	// 配置格式：{"type":"api", "config":{"url":"http://...", "method":"POST", ...}}
	GlobalActionFactory.Register("email", func() Action {
		return &EmailAction{}
	})

	// 注册MySQL 执行动作
	// 配置格式：{"type":"mysql", "config":{"sql":"INSERT INTO ...", ...}}
	GlobalActionFactory.Register("mysql", func() Action {
		return &MySQLAction{}
	})

}
