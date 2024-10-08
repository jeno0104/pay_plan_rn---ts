import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect} from 'react';
import {useUserStore} from '../../store/getUser';
import AnimatedProgressWheel from 'react-native-progress-wheel';
import {colors} from '../../color';
import {supabase} from '../../lib/supabase';
import {useNavigation} from '@react-navigation/native';

function AfterMakeChallenge({setModalVisible}) {
  // userChallengeList가 비어 있지 않은지 확인
  const userChallengeList = useUserStore(state => state.userChallengeList);
  const resetChallenge = useUserStore(state => state.resetChallenge);
  const userUsedData = useUserStore(state => state.userUsedData);
  const userData = useUserStore(state => state.userData);
  // 초기 변수 정의
  let challenge_name, goal_period_end, goal_period_start, goal_price;
  let totalUsedPrice = userUsedData.reduce((total, item) => {
    return total + Number(item.used_price); // used_price를 숫자로 변환하여 합산
  }, 0);
  if (userChallengeList.length > 0) {
    // userChallengeList[0]에서 데이터를 가져옴
    ({challenge_name, goal_period_end, goal_period_start, goal_price} =
      userChallengeList[0]);
    console.log(
      userChallengeList[0],
      '유저 챌린지 리스트 in AfterMakeChallenges',
    );
  }
  let usedGoalPricePercent = goal_price
    ? (totalUsedPrice / Number(goal_price)) * 100
    : 0;
  const endDate = new Date(goal_period_end);
  const startDate = new Date(goal_period_start);
  const today = new Date();

  // 남은 일수 계산
  const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const giveUpBtnHandler = () => {
    Alert.alert(
      'Alert Title',
      'My Alert Msg',
      [
        {
          text: '포기하기',
          onPress: async () => {
            const {data: challengeUpdateData, error: challengeUpdateError} =
              await supabase
                .from('users_maked_challenge')
                .update({current_status: false, challenge_result: 'GiveUp'})
                .eq('challenge_id', userData[0].current_challenge_num)
                .select();

            if (challengeUpdateError) {
              console.log('챌린지 업데이트 오류:', challengeUpdateError);
              Alert.alert(
                '챌린지 업데이트 오류',
                '챌린지 상태 업데이트에 실패했습니다.',
              );
              return; // 오류가 발생하면 함수 종료
            }

            console.log('챌린지 업데이트 결과:', challengeUpdateData);
            const {data, error} = await supabase
              .from('users')
              .update({current_challenge_num: null})
              .eq('user_id', userData[0].user_id)
              .select();

            resetChallenge();
          },
        },
        {
          text: '취소',
          style: 'cancel',
        },
      ],
      {
        cancelable: true,
        onDismiss: () =>
          Alert.alert(
            'This alert was dismissed by tapping outside of the alert dialog.',
          ),
      },
    );
  };
  const navigation = useNavigation();
  const reviseChallengeHandler = () => {};
  // 챌린지 매니저 코드
  const updateChallengeStatus = async (challengeId, isSuccess) => {
    const {error} = await supabase
      .from('users')
      .update({current_challenge_num: null}) // 상태 업데이트
      .eq('current_challenge_num', challengeId);

    if (error) {
      console.error('첫 번째 업데이트 오류:', error);
    } else {
      console.log('첫 번째 업데이트 성공');
    }
    const status = isSuccess ? 'failure' : 'success';
    const {data: result, error: errors} = await supabase
      .from('users_maked_challenge')
      .update({current_status: false, challenge_result: status}) // 상태 업데이트
      .eq('challenge_id', challengeId);

    console.log(result, '업데이트 된 데이터');
    if (errors) {
      console.error('두 번째 업데이트 오류:', errors);
    } else {
      console.log(`챌린지 ${challengeId} 상태 업데이트 완료: ${status}`);
      // navigation.navigate('ChallengeResult');
    }
  };
  const checkChallenges = async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // 현재 날짜

    const end_date = new Date(userChallengeList[0].goal_period_end);
    endDate.setDate(end_date.getDate() + 1); // 하루 더하기
    const newEndDateString = endDate.toISOString().split('T')[0]; // 새로운 종료 날짜

    // console.log(userChallengeList[0].goal_period_end);
    // 챌린지의 종료 날짜와 비교)
    if (newEndDateString < todayString) {
      await updateChallengeStatus(
        userChallengeList[0].challenge_id,
        goal_price - totalUsedPrice > 0 ? false : true,
        userChallengeList[0],
      ); // 종료 처리
      await resetChallenge(); // 챌린지 리스트에서 제거
    }
  };
  console.log(remainingDays);

  useEffect(() => {
    if (remainingDays < 0) {
      checkChallenges();
    }
  }, [remainingDays]);
  return (
    <View style={styles.container}>
      <View>
        <AnimatedProgressWheel
          size={300}
          width={20}
          color={colors.blueText}
          progress={Number(usedGoalPricePercent)}
          backgroundColor={colors.input}
        />
        <View style={styles.challengeInfo}>
          <View>
            <Text style={styles.challengeNameText}>{challenge_name}</Text>
          </View>
          <View>
            <Text style={styles.challengeDateText}>
              {goal_period_start} - {goal_period_end}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.changeContainer}>
        <View style={styles.challengeChange}>
          <TouchableOpacity style={styles.changeBtn} onPress={giveUpBtnHandler}>
            <Text style={styles.changeBtnText}>포기하기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.challengeChange}>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={reviseChallengeHandler}>
            <Text style={styles.changeBtnText}>수정하기</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.usedInfo}>
        <View>
          <Text style={styles.goalPriceText}>
            목표 금액의{' '}
            <Text style={styles.goalPricePercent}>
              {usedGoalPricePercent.toFixed(1)}%
            </Text>
            를 사용했어요.
          </Text>
        </View>
        <View style={styles.dateInfoText}>
          <View>
            <Text style={styles.latesDateText}>
              남은 일수:{' '}
              <Text style={styles.latesDayText}>{remainingDays}일</Text> /{' '}
              {totalDays}일
            </Text>
          </View>
          <View>
            <Text style={styles.latesPriceText}>
              잔액:{' '}
              <Text style={styles.latePriceText}>
                {(goal_price - totalUsedPrice).toLocaleString()}원
              </Text>{' '}
              / {Number(goal_price).toLocaleString()}원
            </Text>
          </View>
        </View>
        <View style={styles.bottomBtnContainer}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
  },
  changeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  challengeChange: {},
  changeBtn: {
    width: 100,
    height: 40,
    backgroundColor: colors.inputGreyColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  changeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  circleImg: {
    width: 350,
    height: 350,
  },
  challengeInfo: {
    alignItems: 'center',
    position: 'absolute',
    left: 65,
    top: 140,
    gap: 10,
  },
  challengeNameText: {
    color: colors.blackText,
    fontSize: 20,
    fontWeight: '700',
  },
  challengeDateText: {
    color: colors.blackText,
    fontWeight: '700',
  },
  usedInfo: {
    alignItems: 'center',
    gap: 20,
  },
  goalPriceText: {
    color: colors.blackText,
    fontSize: 20,
    fontWeight: 'bold',
  },
  goalPricePercent: {
    color: colors.blueText,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateInfoText: {
    alignItems: 'center',
  },
  latesDayText: {
    color: colors.blueText,
    fontSize: 19,
  },
  latesDateText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.blackText,
  },
  latesPriceText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.blackText,
  },
  latePriceText: {
    color: colors.blueText,
    fontSize: 19,
  },
  bottomBtnContainer: {
    position: 'absolute',
    bottom: -70, // 원하는 위치로 조정
    right: -40,
  },
  bottomBtn: {
    width: 50,
    height: 50,
    borderRadius: 100,
    backgroundColor: colors.blueText,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 30,
    color: 'white',
  },
});
export default AfterMakeChallenge;
