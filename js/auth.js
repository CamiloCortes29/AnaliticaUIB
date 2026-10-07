/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Authentication & Access Control
 */

const UIB_ROLES = {
    ADMINISTRADOR: 'ADMINISTRADOR',
    GERENTE: 'GERENTE'
};

const UIB_USERS = [
    {
        id: 'user_paula',
        name: 'Paula (Administrador)',
        role: UIB_ROLES.ADMINISTRADOR,
        allowedAreas: ['Agricola', 'Aviacion', 'Cyber', 'Salud y Vida', 'Líneas Financieras', 'Marine', 'Property Estatales', 'Property Privados', 'Casuality']
    },
    {
        id: 'user_rosaly',
        name: 'Rosaly (Administrador)',
        role: UIB_ROLES.ADMINISTRADOR,
        allowedAreas: ['Agricola', 'Aviacion', 'Cyber', 'Salud y Vida', 'Líneas Financieras', 'Marine', 'Property Estatales', 'Property Privados', 'Casuality']
    },
    {
        id: 'user_diana',
        name: 'Diana Navarrete (Gerente - Aviación & Marine)',
        role: UIB_ROLES.GERENTE,
        allowedAreas: ['Aviacion', 'Marine']
    },
    {
        id: 'user_gerente_prop',
        name: 'Gerente Property (Estatales & Privados)',
        role: UIB_ROLES.GERENTE,
        allowedAreas: ['Property Estatales', 'Property Privados']
    }
];

class AuthManager {
    constructor() {
        this.currentUser = UIB_USERS[0]; // Default Paula (Admin)
    }

    setCurrentUserById(userId) {
        const found = UIB_USERS.find(u => u.id === userId);
        if (found) {
            this.currentUser = found;
        }
        return this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getAvailableAreas() {
        return this.currentUser.allowedAreas;
    }

    isAdmin() {
        return this.currentUser.role === UIB_ROLES.ADMINISTRADOR;
    }

    canAccessArea(area) {
        return this.currentUser.allowedAreas.includes(area);
    }
}

window.authManager = new AuthManager();
