export const loginPrefix = 'LOGIN_'
export const logoutPrefix = 'LOGOUT_'

export const login = () => ({
  type: 'LOGIN_ATTEMPT',
})

export const logout = () => ({ type: 'LOGOUT_ATTEMPT' })

const reducer = (state = { pending: false, error: false, token: null, encodedToken: null }, action) => {
  switch (action.type) {
    case 'LOGIN_ATTEMPT':
      return {
        ...state,
        pending: true,
        error: false,
      }

    case 'LOGIN_FAILURE':
      return {
        ...state,
        pending: false,
        error: true,
      }

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        pending: false,
        error: false,
        token: action.token,
        encodedToken: action.token,
      }

    case 'LOGOUT_ATTEMPT':
      return {
        ...state,
        pending: true,
        error: false,
      }

    case 'LOGOUT_FAILURE':
      return {
        ...state,
        pending: false,
        error: true,
        token: null,
        encodedToken: null,
      }

    case 'LOGOUT_SUCCESS':
      return {
        ...state,
        pending: false,
        error: false,
        token: null,
        encodedToken: null,
      }

    default:
      return state
  }
}

export default reducer
