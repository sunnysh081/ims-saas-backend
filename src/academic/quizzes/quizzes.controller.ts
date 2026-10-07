import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateQuizDto, ListQuizzesQueryDto, UpdateQuizDto } from './dto/quiz.dto';
import { QuizzesService } from './quizzes.service';

@Controller('institute/quizzes')
@UseGuards(InstituteGuard, PermissionGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @RequirePermissions('quizzes.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListQuizzesQueryDto) {
    return this.quizzesService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('quizzes.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.quizzesService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('quizzes.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateQuizDto) {
    return this.quizzesService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('quizzes.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(instituteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('quizzes.delete')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.quizzesService.remove(instituteId, id);
  }
}
