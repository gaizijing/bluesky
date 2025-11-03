// src/composables/useTime.js
import { ref, onMounted, onUnmounted } from "vue";
import { formatDate } from "@/utils/dateUtils";

export function useCurrentTime(format = "yyyy-MM-dd HH:mm:ss") {
  const currentTime = ref("");
  let timer = null;
  
  const updateTime = () => {
    currentTime.value = formatDate(new Date(), format);
  };
  
  onMounted(() => {
    updateTime();
    timer = setInterval(updateTime, 1000);
  });
  
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
  
  return { currentTime };
}