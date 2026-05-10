import { AIController } from '@/server/ai/controller/ai.controller'
import { AITransferService } from '@/server/ai/service/ai-transfer.service'
import { CompetitionController } from '@/server/competition/controller/competition.controller'
import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'
import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'
import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'
import { LeagueController } from '@/server/league/controller/league.controller'
import { LeagueRepository } from '@/server/league/repository/league.repository'
import { LeagueService } from '@/server/league/service/league.service'
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
const competitionRepository = new CompetitionRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const gameweekRepository = new GameweekRepository()
const paymentRepository = new PaymentRepository()
const leagueRepository = new LeagueRepository()
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
const fantasyTeamService = new FantasyTeamService(fantasyTeamRepository, gameweekRepository, pricingService)
const teamService = new TeamService(teamRepository)
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
const aiTransferService = new AITransferService(fantasyTeamRepository)
const paymentService = new PaymentService(paymentRepository, walletRepository)
const orchestratorService = new OrchestratorService(gameweekService, scoringService, competitionService)

// Controllers
const aiController = new AIController(aiTransferService)
const competitionController = new CompetitionController(competitionService)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)
const gameweekController = new GameweekController(gameweekService)
const leagueController = new LeagueController(leagueService)
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
    gameweekController,
    leagueController,
    paymentController,
    pricingController,
    pricingService,
    scoringController,
    teamController,
    userController,
    walletController,
    orchestratorService,
    competitionService,
} as const
