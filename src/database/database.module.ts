import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = configService.get('NODE_ENV') === 'test';

        // 데이터베이스 설정 값 가져오기
        const type = configService.get('DB_TYPE', 'sqlite'); // 기본값 sqlite
        const host = configService.get('DB_HOST');
        const port = configService.get('DB_PORT');
        const username = configService.get('DB_USERNAME');
        const password = configService.get('DB_PASSWORD');

        // 테스트 환경인 경우 인메모리 사용, 그 외에는 환경 변수 또는 파일명 사용
        let database = configService.get('DB_DATABASE');
        if (isTest && type === 'sqlite') {
          database = ':memory:';
        } else if (!database && type === 'sqlite') {
          database = 'db.sqlite';
        }

        const synchronize = configService.get('DB_SYNCHRONIZE')
          ? configService.get('DB_SYNCHRONIZE') === 'true'
          : !configService.get('NODE_ENV') || configService.get('NODE_ENV') !== 'production';

        const logging = configService.get('DB_LOGGING') === 'true';

        return {
          type,
          host,
          port: port ? parseInt(port, 10) : undefined,
          username,
          password,
          database,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: isTest ? true : synchronize,
          logging: isTest ? false : logging,
          autoLoadEntities: true,
          // SQLite 인메모리 테스트 시 연결이 끊기지 않도록 함 (필요한 경우)
          keepConnectionAlive: isTest && type === 'sqlite',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
