package action

import (
	"context"
	"fmt"
	"go-lighthouse/model"
	"log"
)

// 参数：
//   - ctx: 上下文，用于超时控制和取消
//   - actionConfig: 动作配置（包含Type和Config）
//
// 返回：
//   - error: 执行错误
func ExecuteAction(ctx context.Context, actionConfig model.ActionConfig) error {
	// 1. 根据动作类型创建
	act, err := GlobalActionFactory.CreateAction(actionConfig.Type)
	if err != nil {
		return fmt.Errorf("创建Action实例失败: %w", err)
	}

	// 2. 执行 Action
	if err := act.Execute(ctx, actionConfig.Config); err != nil {
		return fmt.Errorf("执行Action失败[type=%s]: %w", actionConfig.Type, err)
	}

	// 3. 记录执行日志（下一阶段实现WebSocket推送时替换为实时日志）
	log.Printf("[Action] 执行成功: type=%s", actionConfig.Type)

	return nil
}
