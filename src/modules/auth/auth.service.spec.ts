import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';

describe('AuthService', () => {
  let service: AuthService;
  const userRepoMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const organizationsServiceMock = {
    create: jest.fn(),
  };
  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepoMock,
        },
        {
          provide: OrganizationsService,
          useValue: organizationsServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
