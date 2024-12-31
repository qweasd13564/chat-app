export const languages = {
    'zh-CN': {
      name: '简体中文',
      translations: {
        common: {
          send: '发送',
          cancel: '取消',
          confirm: '确认',
          delete: '删除',
          edit: '编辑',
          save: '保存'
        },
        auth: {
          login: '登录',
          register: '注册',
          logout: '退出登录',
          username: '用户名',
          password: '密码'
        },
        chat: {
          newMessage: '新消息',
          addFriend: '添加好友',
          createGroup: '创建群组',
          uploadFile: '上传文件',
          fileTooBig: '文件大小不能超过25MB'
        },
        group: {
          settings: '群设置',
          members: '群成员',
          announcement: '群公告',
          setNickname: '设置群昵称',
          setAdmin: '设置管理员',
          kick: '踢出群聊',
          mute: '禁言'
        }
      }
    },
    'en': {
      name: 'English',
      translations: {
        // ... English translations
      }
    }
  }
  
  export type Language = keyof typeof languages
  export const defaultLanguage: Language = 'zh-CN'