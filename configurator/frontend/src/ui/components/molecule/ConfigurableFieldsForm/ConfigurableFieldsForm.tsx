// @Libs
import React, { useCallback } from 'react';
import { Col, Form, Input, Row, Select, Switch } from 'antd';
import debounce from 'lodash/debounce';
import get from 'lodash/get';
import cn from 'classnames';
// @Components
import { LabelWithTooltip } from '@atom/LabelWithTooltip';
import { EditableList } from '@./lib/components/EditableList/EditableList';
import { CenteredSpin } from '@./lib/components/components';
// @Types
import { Parameter, ParameterType } from '@catalog/sources/types';
import { FormInstance } from 'antd/lib/form/hooks/useForm';
// @Utils
import { makeObjectFromFieldsValues } from '@util/forms/marshalling';
import { isoDateValidator } from '@util/validation/validators';
// @Hooks
import { useForceUpdate } from '@hooks/useForceUpdate';
// @Icons
import EyeTwoTone from '@ant-design/icons/lib/icons/EyeTwoTone';
import EyeInvisibleOutlined from '@ant-design/icons/lib/icons/EyeInvisibleOutlined';
// @Styles
import styles from './ConfigurableFieldsForm.module.less';

const JsonEditor = React.lazy(() => import('@molecule/JsonEditor'));

export interface Props {
  fieldsParamsList: Parameter[];
  form: FormInstance;
  initialValues: any;
  namePrefix?: string;
  handleTouchAnyField: VoidFunc;
}

const ConfigurableFieldsForm = ({ fieldsParamsList, form, initialValues, namePrefix, handleTouchAnyField }: Props) => {
  const handleTouchField = debounce(handleTouchAnyField, 1000);

  const forceUpdate = useForceUpdate();

  const handleChangeIntInput = useCallback((id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');

    form.setFieldsValue({ [id]: value });
  }, [form]);

  const handleChangeSwitch = useCallback((id: string) => (value: boolean) => {
    form.setFieldsValue({ [id]: value });

    forceUpdate();
  }, [form, forceUpdate]);

  const handleJsonChange = (id: string) => (value: string) => {
    form.setFieldsValue({ [id]: value ? value : '' });

    handleTouchField();
  };

  const getFieldComponent = useCallback((type: ParameterType<any>, id: string, additionalProps?: AnyObject) => {
    const fieldsValue = form.getFieldsValue();

    switch (type?.typeName) {
    case 'password':
      return <Input.Password
        autoComplete="off"
        iconRender={visible => visible
          ? <EyeTwoTone />
          : <EyeInvisibleOutlined />}
      />;

    case 'int':
      return <Input autoComplete="off" onChange={handleChangeIntInput(id)} />;

      // ToDo: check if it can be <select> in some cases
    case 'selection':
      return <Select allowClear mode={type.data.maxOptions > 1 ? 'multiple' : undefined} onChange={forceUpdate}>
        {type.data.options.map(({ id, displayName }: Option) =>
          <Select.Option value={id} key={id}>{displayName}</Select.Option>
        )}
      </Select>;

    case 'array/string':
      return <EditableList {...additionalProps} />;

    case 'json':
      return <React.Suspense fallback={<CenteredSpin/>}>
        <JsonEditor handleChange={handleJsonChange(id)} initialValue={form.getFieldValue(id)} />
      </React.Suspense>;

    case 'boolean':
      return <Switch onChange={handleChangeSwitch(id)} checked={get(fieldsValue, id)} />

    case 'string':
    default:
      return <Input autoComplete="off" />;
    }
  }, [handleJsonChange, form, handleChangeSwitch, handleChangeIntInput, forceUpdate]);

  const getInitialValue = useCallback((id: string, defaultValue: any, constantValue: any, type: string) => {
    const initial = get(initialValues, id);

    if (initial) {
      return initial;
    }

    const calcValue = (defaultValue || constantValue) ?? {};

    return type === 'json'
      ? Object.keys(calcValue).length > 0
        ? JSON.stringify(calcValue)
        : ''
      : defaultValue || constantValue;
  }, [initialValues]);

  return (
    <>
      {
        fieldsParamsList.map((param: Parameter) => {
          const { id, documentation, displayName, type, defaultValue, required, constant } = param;

          const constantValue = typeof constant === 'function'
            ? constant?.(makeObjectFromFieldsValues(form.getFieldsValue() ?? {}))
            : constant;
          const isHidden = constantValue !== undefined;

          const additionalProps: AnyObject = {};

          return (
            <Row key={id} className={cn(isHidden && 'hidden')}>
              <Col span={24}>
                <Form.Item
                  className={cn('form-field_fixed-label', styles.field)}
                  initialValue={getInitialValue(id, defaultValue, constantValue, type?.typeName)}
                  name={id}
                  hidden={isHidden}
                  label={
                    documentation ?
                      <LabelWithTooltip documentation={documentation} render={displayName} /> :
                      <span>{displayName}:</span>
                  }
                  labelCol={{ span: 4 }}
                  wrapperCol={{ span: 20 }}
                  rules={
                    !isHidden
                      ? type?.typeName === 'isoUtcDate'
                        ? [isoDateValidator(`${displayName} field is required.`)]
                        : [{ required, message: `${displayName} field is required.` }]
                      : undefined
                  }
                >
                  {getFieldComponent(type, id, additionalProps)}
                </Form.Item>
              </Col>
            </Row>
          );
        })
      }
    </>
  );
};

ConfigurableFieldsForm.displayName = 'ConfigurableFieldsForm';

export { ConfigurableFieldsForm };
