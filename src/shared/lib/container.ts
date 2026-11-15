import { AIController } from '@/server/ai/controller/ai.controller'
import { AiReportRepository } from '@/server/ai/repository/ai-report.repository'
import { AIGeneratorService } from '@/server/ai/service/ai-generator.service'
import { AIInsightsService } from '@/server/ai/service/ai-insights.service'
import { FixtureController } from '@/server/fixtures/controller/fixture.controller'
import { FixtureRepository } from '@/server/fixtures/repository/fixture.repository'
import { FixtureService } from '@/server/fixtures/service/fixture.service'
import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'
import { PaymentController } from '@/server/payment/controller/payment.controller'
import { PaymentRepository } from '@/server/payment/repository/payment.repository'
import { PaymentService } from '@/server/payment/service/payment.service'
import { PricingController } from '@/server/pricing/controller/pricing.controller'
import { PricingRepository } from '@/server/pricing/repository/pricing.repository'
import { PricingService } from '@/server/pricing/service/pricing.service'
import { TeamController } from '@/server/teams/controller/team.controller'
import { TeamRepository } from '@/server/teams/repository/team.repository'
import { TeamService } from '@/server/teams/service/team.service'
import { UserController } from '@/server/user/controller/user.controller'
import { UserRepository } from '@/server/user/repository/user.repository'
import { UserService } from '@/server/user/service/user.service'
import { WalletController } from '@/server/wallet/controller/wallet.controller'
import { WalletRepository } from '@/server/wallet/repository/wallet.repository'
import { WalletService } from '@/server/wallet/service/wallet.service'

// Repositories — instantiated once each, shared across services that need them.
const aiReportRepository = new AiReportRepository()
const fixtureRepository = new FixtureRepository()
const gameweekRepository = new GameweekRepository()
const paymentRepository = new PaymentRepository()
const pricingRepository = new PricingRepository()
const teamRepository = new TeamRepository()
const userRepository = new UserRepository()
const walletRepository = new WalletRepository()

// Services
const walletService = new WalletService(walletRepository)
const userService = new UserService(userRepository)
const gameweekService = new GameweekService(gameweekRepository)
const pricingService = new PricingService(pricingRepository)
const teamService = new TeamService(teamRepository)
const fixtureService = new FixtureService(fixtureRepository)
const aiGeneratorService = new AIGeneratorService()
const aiInsightsService = new AIInsightsService(aiGeneratorService, aiReportRepository, walletService)
const paymentService = new PaymentService(paymentRepository, walletRepository)

// Controllers
const aiController = new AIController(aiInsightsService)
const fixtureController = new FixtureController(fixtureService)
const gameweekController = new GameweekController(gameweekService)
const paymentController = new PaymentController(paymentService)
const pricingController = new PricingController(pricingService)
const teamController = new TeamController(teamService)
const userController = new UserController(userService)
const walletController = new WalletController(walletService)

export const container = {
    aiController,
    fixtureController,
    gameweekController,
    paymentController,
    pricingController,
    pricingService,
    teamController,
    userController,
    walletController,
} as const
