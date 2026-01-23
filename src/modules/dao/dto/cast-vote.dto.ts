import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../enums/vote-type.enum';

export class CastVoteDto {
  @ApiProperty({
    description: 'Type of vote',
    enum: VoteType,
    example: VoteType.FOR,
  })
  @IsEnum(VoteType)
  @IsNotEmpty()
  voteType: VoteType;
}
