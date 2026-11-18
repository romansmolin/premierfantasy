import { AIController } from '@/server/ai/controller/ai.controller'
import { AiReportRepository } from '@/server/ai/repository/ai-report.repository'
import { AIGeneratorService } from '@/server/ai/service/ai-generator.service'
import { AIInsightsService } from '@/server/ai/service/ai-insights.service'
import { BilledRunner } from '@/server/ai/service/billed-runner'
import { AutoBuildController } from '@/server/autobuild/controller/autobuild.controller'
import { AutoBuildExplainer } from '@/server/autobuild/service/autobuild-explainer'
import { AutoBuildService } from '@/server/autobuild/service/autobuild.service'
import { BillingController } from '@/server/billing/controller/billing.controller'
import { BillingRepository } from '@/server/billing/repository/billing.repository'
import { BillingService } from '@/server/billing/service/billing.service'
import { FixtureController } from '@/server/fixtures/controller/fixture.controller'
import { FixtureRepository } from '@/server/fixtures/repository/fixture.repository'
import { FixtureService } from '@/server/fixtures/service/fixture.service'
import { FplMappingController } from '@/server/fpl/controller/fpl-mapping.controller'
import { createFplClient } from '@/server/fpl/lib/fpl-client'
import { FplMappingRepository } from '@/server/fpl/repository/fpl-mapping.repository'
import { FplMappingService } from '@/server/fpl/service/fpl-mapping.service'
import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'
import { PaymentController } from '@/server/payment/controller/payment.controller'
import { PaymentRepository } from '@/server/payment/repository/payment.repository'
import { PaymentService } from '@/server/payment/service/payment.service'
import { ForecastDataRepository } from '@/server/prediction/repository/forecast-data.repository'
import { ForecastRepository } from '@/server/prediction/repository/forecast.repository'
import { ProbabilityRepository } from '@/server/prediction/repository/probability.repository'
import { ForecastService } from '@/server/prediction/service/forecast.service'
import { ProbabilityService } from '@/server/prediction/service/probability.service'
import { PricingController } from '@/server/pricing/controller/pricing.controller'
import { PricingRepository } from '@/server/pricing/repository/pricing.repository'
import { PricingService } from '@/server/pricing/service/pricing.service'
import { ScoutController } from '@/server/scout/controller/scout.controller'
import { ScoutService } from '@/server/scout/service/scout.service'
import { BuilderController } from '@/server/squad/controller/builder.controller'
import { SquadController } from '@/server/squad/controller/squad.controller'
import { SquadRepository } from '@/server/squad/repository/squad.repository'
import { BuilderService } from '@/server/squad/service/builder.service'
import { SquadReviewGenerator } from '@/server/squad/service/squad-review.generator'
import { SquadReviewService } from '@/server/squad/service/squad-review.service'
import { SquadService } from '@/server/squad/service/squad.service'
import { StatsRepository } from '@/server/stats/repository/stats.repository'
import { StatsService } from '@/server/stats/service/stats.service'
import { SyncCronController } from '@/server/sync/controller/sync-cron.controller'
import { buildJobs } from '@/server/sync/jobs'
import { createSyncContainer } from '@/server/sync/sync.container'
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
const fplMappingRepository = new FplMappingRepository()
const billingRepository = new BillingRepository()
const fixtureRepository = new FixtureRepository()
const gameweekRepository = new GameweekRepository()
const paymentRepository = new PaymentRepository()
const pricingRepository = new PricingRepository()
const teamRepository = new TeamRepository()
const userRepository = new UserRepository()
const walletRepository = new WalletRepository()

// Services
const walletService = new WalletService(walletRepository)
const billingService = new BillingService(billingRepository)
const userService = new UserService(userRepository)
const gameweekService = new GameweekService(gameweekRepository)
const pricingService = new PricingService(pricingRepository)
const teamService = new TeamService(teamRepository)
const fixtureService = new FixtureService(fixtureRepository)
const aiGeneratorService = new AIGeneratorService()
const aiInsightsService = new AIInsightsService(aiGeneratorService, aiReportRepository, walletService)
const paymentService = new PaymentService(paymentRepository, walletRepository)
const fplMappingService = new FplMappingService(fplMappingRepository, createFplClient())
const syncContainer = createSyncContainer()
const forecastDataRepository = new ForecastDataRepository()
const forecastService = new ForecastService(forecastDataRepository, new ForecastRepository())
const probabilityService = new ProbabilityService(forecastDataRepository, new ProbabilityRepository())
const statsRepository = new StatsRepository()
const statsService = new StatsService(statsRepository, forecastService, probabilityService)
const scoutService = new ScoutService(statsService, statsRepository)
const squadRepository = new SquadRepository()
const squadService = new SquadService(squadRepository)
const builderService = new BuilderService(statsService, squadRepository)
const builderController = new BuilderController(builderService)
const billedRunner = new BilledRunner(aiReportRepository, walletService)
const autoBuildService = new AutoBuildService(
    builderService,
    forecastService,
    billedRunner,
    new AutoBuildExplainer(),
)
const squadReviewService = new SquadReviewService(
    squadService,
    builderService,
    forecastService,
    billedRunner,
    new SquadReviewGenerator(),
)
const squadController = new SquadController(squadService)
const scoutController = new ScoutController(scoutService)

// Controllers
const billingController = new BillingController(billingService)
const aiController = new AIController(aiInsightsService)
const autoBuildController = new AutoBuildController(autoBuildService, squadReviewService)
const fixtureController = new FixtureController(fixtureService)
const fplMappingController = new FplMappingController(fplMappingService)
const syncCronController = new SyncCronController(syncContainer.syncRunRepository, (budget) =>
    buildJobs(syncContainer, budget),
)
const gameweekController = new GameweekController(gameweekService)
const paymentController = new PaymentController(paymentService)
const pricingController = new PricingController(pricingService)
const teamController = new TeamController(teamService)
const userController = new UserController(userService)
const walletController = new WalletController(walletService)

export const container = {
    aiController,
    autoBuildController,
    billingController,
    fixtureController,
    fplMappingController,
    syncCronController,
    statsService,
    scoutController,
    forecastService,
    probabilityService,
    squadController,
    builderController,
    squadService,
    gameweekController,
    paymentController,
    pricingController,
    pricingService,
    teamController,
    userController,
    walletController,
} as const
