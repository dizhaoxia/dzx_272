import { Router } from 'express';
import { allQuery, getQuery } from '../database';
import { CaregiverWithUser } from '../types';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { service_type, sort_by, sort_order, page = '1', page_size = '10' } = req.query;

    let sql = `
      SELECT cp.id, cp.user_id, u.username, u.name, u.phone, 
             cp.avatar, cp.bio, cp.certificate_url, cp.work_years, 
             cp.service_types, cp.hourly_rate, cp.daily_rate, cp.rating, cp.rating_count
      FROM caregiver_profiles cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (service_type && service_type !== 'all') {
      sql += ' AND cp.service_types LIKE ?';
      params.push(`%${service_type}%`);
    }

    const sortBy = sort_by || 'rating';
    const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';
    const validSortFields = ['rating', 'hourly_rate', 'daily_rate', 'work_years'];
    const orderBy = validSortFields.includes(sortBy as string) ? sortBy : 'rating';
    sql += ` ORDER BY cp.${orderBy} ${sortOrder}`;

    const pageNum = parseInt(page as string);
    const pageSize = parseInt(page_size as string);
    const offset = (pageNum - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const caregivers = await allQuery<CaregiverWithUser>(sql, params);

    let countSql = `
      SELECT COUNT(*) as total
      FROM caregiver_profiles cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    if (service_type && service_type !== 'all') {
      countSql += ' AND cp.service_types LIKE ?';
      countParams.push(`%${service_type}%`);
    }
    const countResult: any = await getQuery(countSql, countParams);

    res.json({
      caregivers,
      pagination: {
        page: pageNum,
        page_size: pageSize,
        total: countResult?.total || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const caregiver = await getQuery<CaregiverWithUser>(
      `SELECT cp.id, cp.user_id, u.username, u.name, u.phone, 
              cp.avatar, cp.bio, cp.certificate_url, cp.work_years, 
              cp.service_types, cp.hourly_rate, cp.daily_rate, cp.rating, cp.rating_count
       FROM caregiver_profiles cp
       INNER JOIN users u ON cp.user_id = u.id
       WHERE cp.id = ?`,
      [id]
    );

    if (!caregiver) {
      res.status(404).json({ message: '护工不存在' });
      return;
    }

    res.json({ caregiver });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
