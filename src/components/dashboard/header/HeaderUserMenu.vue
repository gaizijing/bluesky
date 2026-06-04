<template>
  <el-dropdown trigger="click">
    <div class="user-menu">
      <img src="@/assets/icons/ic_user.png" alt="user" class="user-menu__avatar" />
      <span v-if="displayName" class="user-menu__name">{{ displayName }}</span>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-if="isAdmin" @click="goSetting">
          <el-icon><Management /></el-icon>
          系统设置
        </el-dropdown-item>
        <el-dropdown-item @click="logout">
          <span>退出登录</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Management } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { getUserInfo } from '@/utils/storageUtils';
import { canAccessSettingFromStorage } from '@/utils/roleUtils';
import { userLogout } from '@/api/auth';

const router = useRouter();
const isAdmin = ref(canAccessSettingFromStorage());

const displayName = computed(() => {
  const info = getUserInfo();
  return info?.username || info?.name || '';
});

function goSetting() {
  router.push('/setting');
}

async function logout() {
  try {
    await userLogout();
    router.push('/login');
  } catch (err) {
    console.error(err);
    ElMessage.error('登出失败');
  }
}
</script>

<style scoped lang="scss">
.user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-menu__avatar {
  width: 36px;
  height: 50px;
}

.user-menu__name {
  font-size: 13px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
