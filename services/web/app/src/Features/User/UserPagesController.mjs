import UserGetter from './UserGetter.js'
import OError from '@overleaf/o-error'
import UserSessionsManager from './UserSessionsManager.js'
import logger from '@overleaf/logger'
import Settings from '@overleaf/settings'
import AuthenticationController from '../Authentication/AuthenticationController.js'
import SessionManager from '../Authentication/SessionManager.js'
import NewsletterManager from '../Newsletter/NewsletterManager.js'
import SubscriptionLocator from '../Subscription/SubscriptionLocator.js'
import _ from 'lodash'
import { expressify } from '@overleaf/promise-utils'
import Features from '../../infrastructure/Features.js'
import SplitTestHandler from '../SplitTests/SplitTestHandler.js'
import Modules from '../../infrastructure/Modules.js'
import AuthenticationManager from '../Authentication/AuthenticationManager.js'
import UserRegistrationHandler from './UserRegistrationHandler.js'
import { random } from '../../../../scripts/lezer-latex/random.mjs'

async function settingsPage(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const reconfirmationRemoveEmail = req.query.remove
  // SSO
  const ssoError = req.session.ssoError
  if (ssoError) {
    delete req.session.ssoError
  }
  const ssoErrorMessage = req.session.ssoErrorMessage
  if (ssoErrorMessage) {
    delete req.session.ssoErrorMessage
  }
  const projectSyncSuccessMessage = req.session.projectSyncSuccessMessage
  if (projectSyncSuccessMessage) {
    delete req.session.projectSyncSuccessMessage
  }
  // Institution SSO
  let institutionLinked = _.get(req.session, ['saml', 'linked'])
  if (institutionLinked) {
    // copy object if exists because _.get does not
    institutionLinked = Object.assign(
      {
        hasEntitlement: _.get(req.session, ['saml', 'hasEntitlement']),
      },
      institutionLinked
    )
  }
  const samlError = _.get(req.session, ['saml', 'error'])
  const institutionEmailNonCanonical = _.get(req.session, [
    'saml',
    'emailNonCanonical',
  ])
  const institutionRequestedEmail = _.get(req.session, [
    'saml',
    'requestedEmail',
  ])

  const reconfirmedViaSAML = _.get(req.session, ['saml', 'reconfirmed'])
  delete req.session.saml
  let shouldAllowEditingDetails = true
  if (Settings.ldap && Settings.ldap.updateUserDetailsOnLogin) {
    shouldAllowEditingDetails = false
  }
  if (Settings.saml && Settings.saml.updateUserDetailsOnLogin) {
    shouldAllowEditingDetails = false
  }
  const oauthProviders = Settings.oauthProviders || {}

  const user = await UserGetter.promises.getUser(userId)
  if (!user) {
    // The user has just deleted their account.
    return UserSessionsManager.removeSessionsFromRedis(
      { _id: userId },
      null,
      () => res.redirect('/')
    )
  }

  let personalAccessTokens
  try {
    const results = await Modules.promises.hooks.fire(
      'listPersonalAccessTokens',
      user._id
    )
    personalAccessTokens = results?.[0] ?? []
  } catch (error) {
    const err = OError.tag(error, 'listPersonalAccessTokens hook failed')
    logger.error({ err, userId }, err.message)
  }

  let currentManagedUserAdminEmail
  try {
    currentManagedUserAdminEmail =
      await SubscriptionLocator.promises.getAdminEmail(req.managedBy)
  } catch (err) {
    logger.error({ err }, 'error getting subscription admin email')
  }

  let memberOfSSOEnabledGroups = []
  try {
    memberOfSSOEnabledGroups =
      (
        await Modules.promises.hooks.fire(
          'getUserGroupsSSOEnrollmentStatus',
          user._id,
          { teamName: 1 },
          ['email']
        )
      )?.[0] || []
    memberOfSSOEnabledGroups = memberOfSSOEnabledGroups.map(group => {
      return {
        groupId: group._id.toString(),
        linked: group.linked,
        groupName: group.teamName,
        adminEmail: group.admin_id?.email,
      }
    })
  } catch (error) {
    logger.error(
      { err: error },
      'error fetching groups with Group SSO enabled the user may be member of'
    )
  }

  res.render('user/settings', {
    title: 'account_settings',
    user: {
      id: user._id,
      isAdmin: user.isAdmin,
      email: user.email,
      allowedFreeTrial: user.allowedFreeTrial,
      first_name: user.first_name,
      last_name: user.last_name,
      alphaProgram: user.alphaProgram,
      betaProgram: user.betaProgram,
      labsProgram: user.labsProgram,
      features: {
        dropbox: user.features.dropbox,
        github: user.features.github,
        mendeley: user.features.mendeley,
        zotero: user.features.zotero,
        papers: user.features.papers,
        references: user.features.references,
      },
      refProviders: {
        mendeley: Boolean(user.refProviders?.mendeley),
        zotero: Boolean(user.refProviders?.zotero),
        papers: Boolean(user.refProviders?.papers),
      },
      writefull: {
        enabled: Boolean(user.writefull?.enabled),
      },
      aiErrorAssistant: {
        enabled: Boolean(user.aiErrorAssistant?.enabled),
      },
    },
    labsExperiments: user.labsExperiments ?? [],
    hasPassword: !!user.hashedPassword,
    shouldAllowEditingDetails,
    oauthProviders: UserPagesController._translateProviderDescriptions(
      oauthProviders,
      req
    ),
    institutionLinked,
    samlError,
    institutionEmailNonCanonical:
      institutionEmailNonCanonical && institutionRequestedEmail
        ? institutionEmailNonCanonical
        : undefined,
    reconfirmedViaSAML,
    reconfirmationRemoveEmail,
    samlBeta: req.session.samlBeta,
    ssoErrorMessage,
    thirdPartyIds: UserPagesController._restructureThirdPartyIds(user),
    projectSyncSuccessMessage,
    personalAccessTokens,
    emailAddressLimit: Settings.emailAddressLimit,
    isManagedAccount: !!req.managedBy,
    userRestrictions: Array.from(req.userRestrictions || []),
    currentManagedUserAdminEmail,
    gitBridgeEnabled: Settings.enableGitBridge,
    isSaas: Features.hasFeature('saas'),
    memberOfSSOEnabledGroups,
  })
}

async function accountSuspended(req, res) {
  if (SessionManager.isUserLoggedIn(req.session)) {
    return res.redirect('/project')
  }
  res.render('user/accountSuspended', {
    title: 'your_account_is_suspended',
  })
}

async function reconfirmAccountPage(req, res) {
  const pageData = {
    reconfirm_email: req.session.reconfirm_email,
  }
  const { variant } = await SplitTestHandler.promises.getAssignment(
    req,
    res,
    'bs5-auth-pages'
  )

  const template =
    variant === 'enabled' ? 'user/reconfirm-bs5' : 'user/reconfirm'

  res.render(template, pageData)
}

const UserPagesController = {
  accountSuspended: expressify(accountSuspended),

  registerPage(req, res) {
    const sharedProjectData = req.session.sharedProjectData || {}

    const newTemplateData = {}
    if (req.session.templateData != null) {
      newTemplateData.templateName = req.session.templateData.templateName
    }

    res.render('user/register', {
      title: 'register',
      sharedProjectData,
      newTemplateData,
      samlBeta: req.session.samlBeta,
    })
  },

  async loginPage(req, res) {
    const { ticket } = req.query;
    const client_id = "0XJKMPittJvrjCusL5";
    const client_secret = "1353762ef51e438684481129460e415a";
    const redirect_uri = "https://overleaf.zju.edu.cn/login";

    let err = null;
    let accessTokenData = null;
    let userInfoData = null;

    // ZJU SSO
    if (ticket) {
      // 换token
      try {
        const accessTokenRes = await fetch(`https://zjuam.zju.edu.cn/cas/oauth2.0/accessToken?client_id=${client_id}&code=${ticket}&client_secret=${client_secret}&redirect_uri=${redirect_uri}`, {
          method: "GET",
        })
        accessTokenData = await accessTokenRes.json();
      } catch (err) {
        logger.error({ err }, 'accessTokenErr')
      }
      // token换用户信息
      try {
        if (accessTokenData?.access_token) {
          const userInfoRes = await fetch(`https://zjuam.zju.edu.cn/cas/oauth2.0/profile?access_token=${accessTokenData?.access_token}`, {
            method: "GET",
          })
          userInfoData = await userInfoRes.json();
          logger.info(`userInfoData: ${JSON.stringify(userInfoData)}`);
        }
      } catch (err) {
        logger.error({ err }, 'error getting access token')
      }
    }

    const code = userInfoData?.attributes.find(d => d?.CODE)?.CODE;
    logger.info(`user code: ${code}`);
    let email = "";
    if (code) {
      email = `${code}@zju.edu.cn`
    }
    logger.info(`user email: ${email}`);

    if (email) {
      try {
        // 生成符合要求的密码
        const emailPrefix = email?.split('@')?.[0] || random();
        // 生成一个完全符合要求的密码：
        // 1. 长度至少 8 个字符
        // 2. 包含大写字母、小写字母、数字和特殊字符
        // 3. 不与邮箱地址相似
        // 4. 不包含邮箱地址或其部分
        const emailBase64 = Buffer.from(email).toString('base64')
        const password = `P0ssw0rd${emailBase64}` // 使用固定前缀 + base64编码的邮箱

        // 检查用户是否已存在
        const existingUser = await UserGetter.promises.getUserByAnyEmail(email)

        if (!existingUser) {
          // 用户不存在，进行注册
          try {
            // 验证邮箱和密码
            const emailError = AuthenticationManager.validateEmail(email)
            const passwordError = AuthenticationManager.validatePassword(password, email)

            if (emailError) {
              logger.error({ email }, '邮箱验证失败：' + emailError.message)
              return res.render('user/login', {
                email,
                title: Settings.nav?.login_support_title || 'login',
                login_support_title: Settings.nav?.login_support_title,
                login_support_text: Settings.nav?.login_support_text,
                error: '邮箱格式不正确'
              })
            }

            if (passwordError) {
              logger.error({ email }, '密码验证失败：' + passwordError.message)
              return res.render('user/login', {
                email,
                title: Settings.nav?.login_support_title || 'login',
                login_support_title: Settings.nav?.login_support_title,
                login_support_text: Settings.nav?.login_support_text,
                error: '密码格式不正确：' + passwordError.message
              })
            }

            const user = await UserRegistrationHandler.promises.registerNewUser({
              email,
              password,
              first_name: emailPrefix, // 使用邮箱前缀作为名字
              last_name: ''
            })
            logger.info({ email }, '注册信息：' + JSON.stringify(user || {}))
          } catch (error) {
            if (error.message === 'EmailAlreadyRegistered') {
              // 如果邮箱已注册，继续尝试登录
              logger.debug({ email }, 'user already exists, trying to login')
            } else {
              logger.error({ email }, '注册失败：' + error.message)
              return res.render('user/login', {
                email,
                title: Settings.nav?.login_support_title || 'login',
                login_support_title: Settings.nav?.login_support_title,
                login_support_text: Settings.nav?.login_support_text,
                error: '注册失败：' + error.message
              })
            }
          }
        }

        // 进行登录
        const { user, isPasswordReused } = await AuthenticationManager.promises.authenticate(
          { email },
          password,
          {
            ipAddress: req.ip,
            info: { method: 'Password login' }
          },
          { enforceHIBPCheck: true }
        )

        if (!user) {
          return res.render('user/login', {
            email,
            title: Settings.nav?.login_support_title || 'login',
            login_support_title: Settings.nav?.login_support_title,
            login_support_text: Settings.nav?.login_support_text,
            error: '登录失败，请检查邮箱和密码'
          })
        }

        // 登录成功，设置会话
        await AuthenticationController.promises.finishLogin(user, req, res)

        // 重定向到首页或指定页面
        const redirectTo = req.query.redir || '/project' // 默认重定向到项目页面
        logger.info({
          email,
          redirectTo,
          userId: user._id
        }, '登录成功，准备重定向')

        return res.redirect(redirectTo)
      } catch (error) {
        logger.error({
          err: error,
          action: 'auto_login_register',
          email: email
        }, '自动注册登录失败')

        // 如果已经发送了响应，直接返回
        if (res.headersSent) {
          return
        }

        return res.render('user/login', {
          email,
          title: Settings.nav?.login_support_title || 'login',
          login_support_title: Settings.nav?.login_support_title,
          login_support_text: Settings.nav?.login_support_text,
          error: '自动注册登录失败，请手动登录'
        })
      }
    }

    // 如果没有 email 参数，显示普通登录页面
    if (
      req.query.redir != null &&
      AuthenticationController.getRedirectFromSession(req) == null
    ) {
      AuthenticationController.setRedirectInSession(req, req.query.redir)
    }

    res.render('user/login', {
      email: req?.query?.email,
      title: Settings.nav?.login_support_title || 'login',
      login_support_title: Settings.nav?.login_support_title,
      login_support_text: Settings.nav?.login_support_text,
    })
  },

  /**
   * Landing page for users who may have received one-time login
   * tokens from the read-only maintenance site.
   *
   * We tell them that Overleaf is back up and that they can login normally.
   */
  oneTimeLoginPage(req, res, next) {
    res.render('user/one_time_login')
  },

  renderReconfirmAccountPage: expressify(reconfirmAccountPage),

  settingsPage: expressify(settingsPage),

  sessionsPage(req, res, next) {
    const user = SessionManager.getSessionUser(req.session)
    logger.debug({ userId: user._id }, 'loading sessions page')
    const currentSession = {
      ip_address: user.ip_address,
      session_created: user.session_created,
    }
    UserSessionsManager.getAllUserSessions(
      user,
      [req.sessionID],
      (err, sessions) => {
        if (err != null) {
          OError.tag(err, 'error getting all user sessions', {
            userId: user._id,
          })
          return next(err)
        }
        res.render('user/sessions', {
          title: 'sessions',
          currentSession,
          sessions,
        })
      }
    )
  },

  emailPreferencesPage(req, res, next) {
    const userId = SessionManager.getLoggedInUserId(req.session)
    UserGetter.getUser(
      userId,
      { _id: 1, email: 1, first_name: 1, last_name: 1 },
      (err, user) => {
        if (err != null) {
          return next(err)
        }
        NewsletterManager.subscribed(user, (err, subscribed) => {
          if (err != null) {
            OError.tag(err, 'error getting newsletter subscription status')
            return next(err)
          }
          res.render('user/email-preferences', {
            title: 'newsletter_info_title',
            subscribed,
          })
        })
      }
    )
  },

  async compromisedPasswordPage(req, res) {
    res.render('user/compromised_password')
  },

  _restructureThirdPartyIds(user) {
    // 3rd party identifiers are an array of objects
    // this turn them into a single object, which
    // makes data easier to use in template
    if (
      !user.thirdPartyIdentifiers ||
      user.thirdPartyIdentifiers.length === 0
    ) {
      return null
    }
    return user.thirdPartyIdentifiers.reduce((obj, identifier) => {
      obj[identifier.providerId] = identifier.externalUserId
      return obj
    }, {})
  },

  _translateProviderDescriptions(providers, req) {
    const result = {}
    if (providers) {
      for (const provider in providers) {
        const data = providers[provider]
        data.description = req.i18n.translate(
          data.descriptionKey,
          Object.assign({}, data.descriptionOptions)
        )
        result[provider] = data
      }
    }
    return result
  },
}

export default UserPagesController
