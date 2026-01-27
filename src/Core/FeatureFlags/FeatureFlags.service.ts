@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FeatureFlag)
    private readonly repo: Repository<FeatureFlag>,
  ) {}

  async isEnabled(key: string): Promise<boolean> {
    // 1️⃣ Env override (highest priority)
    const env = this.config.get<string>(`FEATURE_${key}`);
    if (env !== undefined) return env === 'true';

    // 2️⃣ DB lookup
    const flag = await this.repo.findOne({ where: { key } });

    // 3️⃣ Safe default
    return flag?.enabled ?? false;
  }
}
