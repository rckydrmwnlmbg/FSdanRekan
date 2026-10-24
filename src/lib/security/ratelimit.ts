import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const inquiry = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'rl:inquiry',
})

const login = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:login',
})

export const limitByIp = async (ip: string): Promise<boolean> =>
  (await inquiry.limit(ip)).success

export const limitLogin = async (ip: string, email: string): Promise<boolean> =>
  (await login.limit(`${ip}:${email.toLowerCase()}`)).success
