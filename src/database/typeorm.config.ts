import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export { ConfigModule, ConfigService };
export const typeOrmModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.getOrThrow<string>('DATABASE_HOST'),
    port: config.get<number>('DATABASE_PORT') ?? 5432,
    database: config.getOrThrow<string>('DATABASE_NAME'),
    username: config.getOrThrow<string>('DATABASE_USER'),
    password: config.getOrThrow<string>('DATABASE_PASSWORD'),
    autoLoadEntities: true,
    synchronize: config.get('NODE_ENV') !== 'production',
    // Force the session timezone to UTC so timestamp round-trips are exact
    // regardless of the machine/DB timezone (classic TypeORM+pg pitfall:
    // local-time serialization vs session timezone corrupts Date columns).
    extra: { options: '-c timezone=UTC' },
  }),
});
