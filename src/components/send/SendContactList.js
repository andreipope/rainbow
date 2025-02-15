import { sortBy, toLower } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import DeviceInfo from 'react-native-device-info';
import { SectionList } from 'react-native-gesture-handler';
import { useSafeArea } from 'react-native-safe-area-context';
import styled from 'styled-components';
import Divider from '../Divider';
import { FlyInAnimation } from '../animations';
import { ContactRow, SwipeableContactRow } from '../contacts';
import { SheetHandleFixedToTopHeight } from '../sheet';
import { Text } from '../text';
import { InvalidPasteToast, ToastPositionContainer } from '../toasts';
import SendEmptyState from './SendEmptyState';
import { useAccountSettings, useKeyboardHeight } from '@rainbow-me/hooks';

import { useNavigation } from '@rainbow-me/navigation';
import Routes from '@rainbow-me/routes';
import { filterList } from '@rainbow-me/utils';

const KeyboardArea = styled.View`
  height: ${({ insets, keyboardHeight }) =>
    DeviceInfo.hasNotch() ? keyboardHeight : keyboardHeight - insets.top};
`;

const rowHeight = 62;
const getItemLayout = (data, index) => ({
  index,
  length: rowHeight,
  offset: rowHeight * index,
});
const contentContainerStyle = { paddingBottom: 32 };
const keyExtractor = item => `SendContactList-${item.address}`;

const SectionTitle = styled(Text).attrs({
  size: 'bmedium',
  weight: 'semibold',
})`
  margin-left: 15;
  padding-top: 15;
  padding-bottom: 10;
`;
const SectionWrapper = styled.View`
  margin-bottom: 5;
  background-color: ${({ theme: { colors } }) => colors.white};
`;
const SendContactFlatList = styled(SectionList).attrs({
  alwaysBounceVertical: true,
  contentContainerStyle,
  directionalLockEnabled: true,
  getItemLayout,
  keyboardDismissMode: 'none',
  keyboardShouldPersistTaps: 'always',
  keyExtractor,
  marginTop: 0,
})`
  flex: 1;
`;

export default function SendContactList({
  contacts,
  currentInput,
  onPressContact,
  removeContact,
  userAccounts,
}) {
  const { accountAddress } = useAccountSettings();
  const { navigate } = useNavigation();
  const insets = useSafeArea();
  const keyboardHeight = useKeyboardHeight();

  const contactRefs = useRef({});
  const touchedContact = useRef(undefined);

  const filteredContacts = useMemo(
    () => filterList(contacts, currentInput, ['nickname']),
    [contacts, currentInput]
  );

  const handleCloseAllDifferentContacts = useCallback(address => {
    if (touchedContact.current && contactRefs.current[touchedContact.current]) {
      contactRefs.current[touchedContact.current].close();
    }
    touchedContact.current = toLower(address);
  }, []);

  const handleEditContact = useCallback(
    ({ address, color, nickname }) => {
      navigate(Routes.MODAL_SCREEN, {
        additionalPadding: true,
        address,
        color,
        contact: { address, color, nickname },
        type: 'contact_profile',
      });
    },
    [navigate]
  );

  const renderItemCallback = useCallback(
    ({ item, section }) => {
      const ComponentToReturn =
        section.id === 'contacts' ? SwipeableContactRow : ContactRow;
      return (
        <ComponentToReturn
          accountType={section.id}
          onPress={onPressContact}
          onSelectEdit={handleEditContact}
          onTouch={handleCloseAllDifferentContacts}
          ref={component => {
            contactRefs.current[toLower(item.address)] = component;
          }}
          removeContact={removeContact}
          {...item}
        />
      );
    },
    [
      handleCloseAllDifferentContacts,
      handleEditContact,
      onPressContact,
      removeContact,
    ]
  );

  const filteredAddresses = useMemo(() => {
    return sortBy(
      filterList(
        userAccounts.filter(
          account => toLower(account.address) !== toLower(accountAddress)
        ),
        currentInput,
        ['label']
      ),
      ['index']
    );
  }, [accountAddress, currentInput, userAccounts]);

  const sections = useMemo(() => {
    const tmp = [];
    filteredContacts.length &&
      tmp.push({ data: filteredContacts, id: 'contacts', title: 'Contacts' });
    filteredAddresses.length &&
      tmp.push({
        data: filteredAddresses,
        id: 'accounts',
        title: 'Transfer between your accounts',
      });
    return tmp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAddresses, filteredContacts, currentInput]);

  return (
    <FlyInAnimation>
      {filteredContacts.length === 0 && filteredAddresses.length === 0 ? (
        <SendEmptyState />
      ) : (
        <SendContactFlatList
          keyExtractor={(item, index) => index}
          renderItem={renderItemCallback}
          renderSectionHeader={({ section }) => (
            <SectionWrapper>
              <SectionTitle>{section.title}</SectionTitle>
              <Divider />
            </SectionWrapper>
          )}
          sections={sections}
          testID="send-contact-list"
        />
      )}
      <ToastPositionContainer
        bottom={
          DeviceInfo.hasNotch()
            ? keyboardHeight - SheetHandleFixedToTopHeight
            : keyboardHeight - SheetHandleFixedToTopHeight * 1.5
        }
      >
        <InvalidPasteToast />
      </ToastPositionContainer>
      {ios && <KeyboardArea insets={insets} keyboardHeight={keyboardHeight} />}
    </FlyInAnimation>
  );
}
