import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TimeBlockDto } from './dto/time-block.dto'

@Injectable()
export class TimeBlockService {
	constructor(private prisma: PrismaService) { }

	async getAll(userId: string) {
		return this.prisma.timeBlock.findMany({
			where: {
				userId
			},
			orderBy: {
				order: 'asc'
			}
		})
	}

	async create(dto: TimeBlockDto, userId: string) {
		// Проверка на длительность более 1440 минут (24 часа)
		if (dto.duration > 1440) {
			throw new BadRequestException('A time block cannot exceed 24 hours.');
		}

		// Получаем общее время занятости пользователя
		const userTimeBlocks = await this.prisma.timeBlock.findMany({
			where: {
				userId,
			},
		});

		const totalTime = userTimeBlocks.reduce((acc, block) => acc + block.duration, 0);

		// Проверка, что суммарное время с новым блоком не превысит 1440 минут
		if (totalTime + dto.duration > 1440) {
			throw new BadRequestException('Total time of all blocks cannot exceed 24 hours.');
		}

		// Создание тайм-блока, если все проверки пройдены
		return this.prisma.timeBlock.create({
			data: {
				...dto,
				user: {
					connect: {
						id: userId,
					},
				},
			},
		});
	}

	async update(
		dto: Partial<TimeBlockDto>,
		timeBlockId: string,
		userId: string
	) {
		return this.prisma.timeBlock.update({
			where: {
				userId,
				id: timeBlockId
			},
			data: dto
		})
	}

	async delete(timeBlockId: string, userId: string) {
		return this.prisma.timeBlock.delete({
			where: {
				id: timeBlockId,
				userId
			}
		})
	}

	async updateOrder(ids: string[]) {
		return this.prisma.$transaction(
			ids.map((id, order) =>
				this.prisma.timeBlock.update({
					where: { id },
					data: { order }
				})
			)
		)
	}
}
