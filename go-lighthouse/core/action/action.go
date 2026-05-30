package action

import (
	"context"
	"fmt"
	"sync"
)

type Action interface {
	Execute(ctx context.Context, config map[string]interface{}) error
}

// ActionFactory 动作工厂
type ActionFactory struct {
	actionMap map[string]func() Action
	mu        sync.RWMutex
}

// NewActionFactory 创建动作工厂实例
func NewActionFactory() *ActionFactory {
	return &ActionFactory{
		actionMap: make(map[string]func() Action),
	}
}

// Register 注册动作类型
// actionType: 动作类型名称（如 "api", "email", "mysql"）
// creator: 创建Action实例的工厂函数
// 使用示例：
//
//	factory := NewActionFactory()
//	factory.Register("api", func() Action { return &APIAction{} })
//	factory.Register("email", func() Action { return &EmailAction{} })
func (f *ActionFactory) Register(actionType string, creator func() Action) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.actionMap[actionType] = creator
}

// CreateAction 根据动作类型创建Action实例
// actionType: 动作类型名称
// 返回：Action实例 或 错误（未注册的类型）
func (f *ActionFactory) CreateAction(actionType string) (Action, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	creator, ok := f.actionMap[actionType]
	if !ok {
		return nil, fmt.Errorf("未注册的动作类型: %s", actionType)
	}
	return creator(), nil
}

// 全局动作工厂模式
var GlobalActionFactory = NewActionFactory()

// ======== 配置读取辅助函数 ===========
// getConfigString 从配置中读取字符串值
// key: 配置键名
// defaultValue: 键不存在时的默认值
func getConfigString(config map[string]interface{}, key string, defaultValue string) string {
	if val, ok := config[key]; ok {
		if strVal, ok := val.(string); ok {
			return strVal
		}
	}
	return defaultValue
}

// getConfigInt 从配置中读取整数值
// 注意：JSON反序列化后数字类型为float64，需要类型转换
// key: 配置键名
// defaultValue: 键不存在时的默认值
func getConfigInt(config map[string]interface{}, key string, defaultValue int) int {
	if val, ok := config[key]; ok {
		if floatVal, ok := val.(float64); ok {
			return int(floatVal)
		}
		if intVal, ok := val.(int); ok {
			return intVal
		}
	}
	return defaultValue
}

// getConfigStringMap 从配置中读取字符串Map
// 用于读取headers等键值对配置
// key: 配置键名
func getConfigStringMap(config map[string]interface{}, key string) map[string]string {
	result := make(map[string]string)
	if val, ok := config[key]; ok {
		if mapVal, ok := val.(map[string]interface{}); ok {
			for k, v := range mapVal {
				if strVal, ok := v.(string); ok {
					result[k] = strVal
				}
			}
		}
	}
	return result
}

// getConfigStringSlice 从配置中读取字符串数组
// 用于读取params等数组配置
// key: 配置键名
func getConfigStringSlice(config map[string]interface{}, key string) []string {
	result := []string{}
	if val, ok := config[key]; ok {
		if sliceVal, ok := val.([]interface{}); ok {
			for _, v := range sliceVal {
				if strVal, ok := v.(string); ok {
					result = append(result, strVal)
				}
			}
		}
	}
	return result
}
