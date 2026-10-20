import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

export const createUser = async (req, res) => {
    const { name, email, username, password, roleId } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username ve password zorunludur.' });
    }

    // `name` is required by the schema; fall back to the username if not given.
    const finalName = name || username;

    // 10 is the general safety standard
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // If roleId is not provided, find the "General Admin" role
        let finalRoleId = roleId;
        if (!finalRoleId) {
            const defaultRole = await prisma.role.findUnique({
                where: { name: 'General Admin' }
            });
            finalRoleId = defaultRole?.id;
        }

        if (!finalRoleId) {
            return res.status(400).json({ error: 'Geçerli bir rol bulunamadı.' });
        }

        const newUser = await prisma.user.create({
            data: {
                name: finalName,
                email: email,
                username: username,
                password: hashedPassword,
                roleId: finalRoleId,
            },
            include: {
                role: true,
                department: true
            }
        });
        
        res.json(newUser);

    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') { 
            return res.status(400).json({ error: 'Bu e-posta adresi veya kullanıcı adı zaten kullanılıyor.' });
        }
        res.status(500).json({ error: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: {
                    select: {
                        name: true
                    }
                },
                department: {
                    select: {
                        name: true
                    }
                }
            }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Kullanıcılar getirilirken bir hata oluştu.' });
    }
};
