import { AIController } from '@/server/ai/controller/ai.controller'
import { AiReportRepository } from '@/server/ai/repository/ai-report.repository'
import { AIGeneratorService } from '@/server/ai/service/ai-generator.service'
import { AIInsightsService } from '@/server/ai/service/ai-insights.service'
import { CompetitionController } from '@/server/competition/controller/competition.controller'
import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'
import { DemoRepository } from '@/server/demo/repository/demo.repository'
import { DemoCompetitionService } from '@/server/demo/service/demo-competition.service'
import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'
import { FixtureController } from '@/server/fixtures/controller/fixture.controller'
import { FixtureRepository } from '@/server/fixtures/repository/fixture.repository'
import { FixtureService } from '@/server/fixtures/service/fixture.service'
import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'
import { LeagueController } from '@/server/league/controller/league.controller'
import { LeagueRepository } from '@/server/league/repository/league.repository'
import { LeagueService } from '@/server/league/service/league.service'
import { LeagueMembershipController } from '@/server/league-membership/controller/league-membership.controller'
import { LeagueMembershipRepository } from '@/server/league-membership/repository/league-membership.repository'
import { LeagueMembershipService } from '@/server/league-membership/service/league-membership.service'
import { OrchestratorService } from '@/server/orchestrator/service/orchestrator.service'
import { PaymentController } from '@/server/payment/controller/payment.controller'
import { PaymentRepository } from '@/server/payment/repository/payment.repository'
import { PaymentService } from '@/server/payment/service/payment.service'
import { PlayerGameweekStatsRepository } from '@/server/player-gameweek-stats/repository/player-gameweek-stats.repository'
import { PricingController } from '@/server/pricing/controller/pricing.controller'
import { PricingRepository } from '@/server/pricing/repository/pricing.repository'
import { PricingService } from '@/server/pricing/service/pricing.service'
import { ScoringController } from '@/server/scoring/controller/scoring.controller'
import { ScoringService } from '@/server/scoring/service/scoring.service'
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
const competitionRepository = new CompetitionRepository()
const demoRepository = new DemoRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const fixtureRepository = new FixtureRepository()
const gameweekRepository = new GameweekRepository()
const paymentRepository = new PaymentRepository()
const leagueRepository = new LeagueRepository()
const leagueMembershipRepository = new LeagueMembershipRepository()
const playerGameweekStatsRepository = new PlayerGameweekStatsRepository()
const pricingRepository = new PricingRepository()
const teamRepository = new TeamRepository()
const userRepository = new UserRepository()
const walletRepository = new WalletRepository()

// Services
const walletService = new WalletService(walletRepository)
const userService = new UserService(userRepository)
const gameweekService = new GameweekService(gameweekRepository)
const pricingService = new PricingService(pricingRepository)
const leagueService = new LeagueService(leagueRepository)
const leagueMembershipService = new LeagueMembershipService(
    leagueMembershipRepository,
    leagueRepository,
    competitionRepository,
    fantasyTeamRepository,
)
const demoCompetitionService = new DemoCompetitionService(demoRepository)
const fantasyTeamService = new FantasyTeamService(
    fantasyTeamRepository,
    gameweekRepository,
    pricingService,
    leagueMembershipService,
    demoCompetitionService,
)
const teamService = new TeamService(teamRepository)
const fixtureService = new FixtureService(fixtureRepository)
const scoringService = new ScoringService(
    gameweekRepository,
    playerGameweekStatsRepository,
    fantasyTeamRepository,
)
const competitionService = new CompetitionService(
    competitionRepository,
    fantasyTeamRepository,
    gameweekRepository,
    walletService,
    leagueRepository,
)
const aiGeneratorService = new AIGeneratorService()
const aiInsightsService = new AIInsightsService(aiGeneratorService, aiReportRepository, walletService)
const paymentService = new PaymentService(paymentRepository, walletRepository)
const orchestratorService = new OrchestratorService(gameweekService, scoringService, competitionService)

// Controllers
const aiController = new AIController(aiInsightsService)
const competitionController = new CompetitionController(competitionService)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)
const fixtureController = new FixtureController(fixtureService)
const gameweekController = new GameweekController(gameweekService)
const leagueController = new LeagueController(leagueService)
const leagueMembershipController = new LeagueMembershipController(leagueMembershipService)
const paymentController = new PaymentController(paymentService)
const pricingController = new PricingController(pricingService)
const scoringController = new ScoringController(scoringService)
const teamController = new TeamController(teamService)
const userController = new UserController(userService)
const walletController = new WalletController(walletService)

export const container = {
    aiController,
    competitionController,
    fantasyTeamController,
    fixtureController,
    gameweekController,
    leagueController,
    leagueMembershipController,
    paymentController,
    pricingController,
    pricingService,
    scoringController,
    teamController,
    userController,
    walletController,
    orchestratorService,
    competitionService,
    demoCompetitionService,
} as const
